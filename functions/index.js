const functions = require('firebase-functions');
const cors = require("cors");
const admin = require('firebase-admin');
const express = require('express');
const stripe = require('stripe')(functions.config().stripe.fittestsecretkey);

const { v4: uuidv4 } = require('uuid');

const app = express()

app.use(express.static('public'));
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000'
}));

exports.app = functions.https.onRequest(app)

admin.initializeApp(functions.config().firebase)



exports.processStripePayment = functions.https.onCall(async (data, context) => {
  try {
    const { product, token } = data;
    const customer = await stripe.customers.create({
      email: token.billing_details.email,
      source: token.id
    });
    const idempotency_key = uuidv4();

    await stripe.charges.create(
      {
        amount: product.price * 100,
        currency: "mxn",
        customer: customer.id,
        receipt_email: token.billing_details.email,
        description: `Purchased the ${product.name}`,
        shipping: {
          name: token.card.brand,
          address: {
            line1: token.billing_details.line1,
            postal_code: token.billing_details.postal_code,
            country: token.billing_details.country,
            city: token.billing_details.city,
          }
        }
      },
      {
        idempotency_key
      }
    );

  } catch (error){
    console.log("Error: ", error)
  }
});
