const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const client = new PlaidApi(configuration);

// create plaid link token
router.get('/plaid_api/create_link_token', async (req, res) => {
    // Get the client_user_id by searching for the current user
    const user = await User.find(...);
    const clientUserId = user.id;
    const request = {
    user: {
        // This should correspond to a unique id for the current user.
        client_user_id: clientUserId,
    },
    client_name: 'Plaid Test App',
    products: [Products.Auth],
    language: 'en',
    webhook: 'https://webhook.example.com',
    redirect_uri: 'https://domainname.com/oauth-page.html',
    country_codes: [CountryCode.Us],
    };

    try {
        const createTokenResponse = await client.linkTokenCreate(request);
        res.status(200).json({ data: createTokenResponse.data });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});

// exchange temp public token for permanent access token
router.get('/plaid_api/exchange_public_token', async (req, res, next) => {
    const publicToken = req.body.public_token;

    try {
        const response = await client.itemPublicTokenExchange({
            public_token: publicToken,
        });

        const accessToken = response.data.access_token;
        const itemID = response.data.item_id;
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// get account auth details
router.get('/plaid_api/get_auth', async (req, res, next) => {
    const accessToken = req.body.access_token;

    try {
        const response = await client.authGet({
            access_token: accessToken,
        });

        // get ach account details
        const accountDetails = response.data.accounts[0];
        const achDetails = response.data.numbers.ach[0];

        const officialName = accountDetails.official_name;
        const subtype = accountDetails.subtype;
        const accountNumber = achDetails.account
        const routingNumber = achDetails.routing
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// create counterparty
router.post('/modern_treasury_api/create_counterparty', async (req, res, next) => {
    var data = JSON.stringify({
        "name": req.body.officialName,
        "accounts": [
            {
            "account_type": req.body.subtype,
            "routing_details": [
                {
                    "routing_number_type": "aba",
                    "routing_number": req.body.routingNumber
                }
            ],
            "account_details": [
                {
                    "account_number": req.body.accountNumber
                }
            ]
            }
        ]
    });

    var config = {
        method: 'post',
        url: 'https://app.moderntreasury.com/api/counterparties',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ORGANIZATION_ID:API_KEY'
        },
        data : data
    };

    try {
        var response = await axios(config);
        const counterpartyData = response.data;

        const counterpartyId = counterpartyData.accounts[0].id
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// create debit ach payment order
router.post('/modern_treasury_api/debit_payment_order', async (req, res, next) => {
    var data = JSON.stringify({
        "type": "ach",
        "amount": req.body.amount,
        "direction": "debit",
        "currency": req.body.currency,
        "originating_account_id": req.body.internalAccountId,
        "receiving_account_id": req.body.counterpartyId
    });

    var config = {
        method: 'post',
        url: 'https://app.moderntreasury.com/api/payment_orders',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ORGANIZATION_ID:API_KEY='
        },
        data : data
    };

    try {
        var response = await axios(config);
        const paymentOrderData = response.data;
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;