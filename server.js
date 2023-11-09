const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const tf = require("@tensorflow/tfjs-node");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const Web3 = require('web3');
const CONTACT_ABI = require('./config');
const CONTACT_ADDRESS = require('./config');
dotenv.config();

// * Server Stuff
const express = require("express");
const busboy = require("busboy");
const util = require("util");
const { name } = require("ejs");


const PORT = 3000;
const app = express();
const disease=['Acne', 'Eczema', 'new_melanoma', 'pityriasis', 'psoriasis', 'vitiligo'];
app.set('view engine','ejs');
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(express.json());

let model = undefined;

const web3Provider = 'HTTP://127.0.0.1:7545'; // Replace with your Ethereum node URL
const web3 = new Web3(web3Provider);
const accounts =  web3.eth.getAccounts();
const contactList = new web3.eth.Contract(CONTACT_ABI.CONTACT_ABI, CONTACT_ADDRESS.CONTACT_ADDRESS);

// Load your custom model here
async function loadCustomModel() {
  const modelPath = "./CustomModel/"; // Replace with your model path
  model = await tf.node.loadSavedModel(modelPath);
}

loadCustomModel()
  .then(() => {
    console.log("Custom model loaded.");
  })
  .catch((error) => {
    console.error("Error loading custom model:", error);
    process.exit(1);
  });

app.get("/",function(req,res){
    res.render("home",{currentPage:"home"});
})

app.get("/about",function(req,res){
    res.render("about",{currentPage:"about"});
})

app.get("/appointment",function(req,res){
    res.render("appointment",{currentPage:"pages"});
})

app.get("/blog",function(req,res){
    res.render("blog",{currentPage:"pages"});
})

app.get("/contact",function(req,res){
    res.render("contact",{currentPage:"contact"});
})

app.get("/detail",function(req,res){
    res.render("detail",{currentPage:"pages"});
})

app.get("/price",function(req,res){
    res.render("price",{currentPage:"price"});
})

app.get("/search",function(req,res){
    res.render("search",{currentPage:"pages"});
})

app.get("/service",function(req,res){
    res.render("service",{currentPage:"service"});
})

app.get("/team",function(req,res){
    res.render("team",{currentPage:"pages"});
})

app.get("/testimonial",function(req,res){
    res.render("testimonial",{currentPage:"pages"});
})

app.get("/predict",function(req,res){
    res.render("predict",{currentPage:"pages"});
})

app.post("/predict", async (req, res) => {
  if (!model) {
    return res.status(500).send("Model is not loaded yet!");
  }

  // Create a Busboy instance
  const formData = {}; // Create an object to store form data

  // Create a Busboy instance
  const bb = busboy({ headers: req.headers });

  // Handle fields (such as non-file data) in the form
  bb.on("field", (fieldname, val) => {
    formData[fieldname] = val;
  });

  // Initialize variables to store the uploaded file data
  let imageBuffer = null;

  bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
    // Handle the uploaded file
    if (fieldname === "image") {
      file.on("data", (data) => {
        if (!imageBuffer) {
          imageBuffer = [];
        }
        imageBuffer.push(data);
      });

      file.on("end", async () => {
        if (imageBuffer) {
          // Convert the buffer to an image tensor
          const image = tf.node.decodeImage(Buffer.concat(imageBuffer));

          // Preprocess the input image to match the expected shape (e.g., 4-dimensional [1, 256, 256, 3])
          const inputImage = image.resizeBilinear([256, 256]).expandDims(0);

          // Convert the input image to float32
          const floatImage = inputImage.toFloat();

          const predictions = await model.predict(floatImage).data();
          let max = predictions[0];
          let result = 0;
          for (let i = 0; i < 6; i++) {
            if (predictions[i] > max) {
              max = predictions[i];
              result = i;
            }
          }
          const name = formData.Name;
          const prediction = disease[result];

          try {
            var senderAddress = '0xCe0320Fa6f4Eb58F5f49c5D50175beCe877C4CbB';//account
            var senderPassword = ''; // Enter the password if the account has one
            const gasLimit = 600000; // Adjust this value based on your contract's needs

            // Unlock the sender account (only if it's supported by your Ethereum client)
            if (senderPassword) {
              await web3.eth.personal.unlockAccount(senderAddress, senderPassword);
            }

            // Check if the contact with the same name and phone number already exists
            const isContactExist = await contactList.methods.isContactExist(name, prediction).call();
            if (isContactExist) {
              return res.status(400).json({ error: 'Contact already exists' });
            }

            // Call the createContact function in your smart contract
            await contactList.methods.createContact(name, prediction).send({ from: senderAddress, gas: gasLimit });

            // Lock the sender account after the transaction (if unlocked)
            if (senderPassword) {
              await web3.eth.personal.lockAccount(senderAddress);
            }

            res.render("report",{Prediction:prediction, Name:name})
          } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An error occurred while creating the contact' });
          }
        } else {
          return res.status(400).json({ error: "No image file uploaded." });
        }
      });
    }
  });

  req.pipe(bb);
});

app.get('/reports', async (request, response) => {
  const contacts = [];

  // Call the new function to get unchecked contacts
  const uncheckedContacts = await contactList.methods.getUncheckedContacts().call();
  const uncheckedIds = uncheckedContacts[0];
  const uncheckedNames = uncheckedContacts[1];
  const uncheckedPredictions = uncheckedContacts[2];

  for (let i = 0; i < uncheckedIds.length; i++) {
    const formattedContact = {
      "id": uncheckedIds[i].toString(),
      "name": uncheckedNames[i],
      "prediction": uncheckedPredictions[i]
    };
    contacts.push(formattedContact);
  }

  response.render('reportList', { contacts: contacts });
});



app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});




