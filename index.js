const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const axios = require('axios');

require("dotenv").config({ path: path.resolve('creds', '.env') })

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const PORT = 5000;
stuff = [];

process.stdin.setEncoding("utf8");
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };

const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use('/css', express.static('css'));

process.stdout.write(`Web server started and running at http://localhost:${PORT}\n`);

const prompt = "Stop to shutdown the server:";
process.stdout.write(prompt);

process.stdin.on("readable", function () {

    let dataInput = process.stdin.read();


    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            process.stdout.write("Shutting down the server");
            process.exit(0);
        } else {// not stop or itemlist
            process.stdout.write(`Invalid command: ${dataInput}`);

        }

        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

async function getRecipe() {
   
    const options = {
        method: 'GET',
        url: 'https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/findByIngredients',

        params: {
            ingredients: stuff.ingredients,//single list of ingredients
            number: '10',
            ignorePantry: 'true',
            ranking: '1'
        },

        headers: {
            'X-RapidAPI-Key': '63de44a735msh57d585521cec57dp1a352bjsn64a90e2c0066',
            'X-RapidAPI-Host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com'
        }
    };

    //Recipes outputted 
    try {
        const response = await axios.request(options);
        
        return response;
    } catch (error) {
        console.error(error);
    }
}

app.set("views", path.resolve(__dirname, "./templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (request, response) => {
    response.render("index");
});

app.post("/", async (request, response) => {
    const uri = `mongodb+srv://${userName}:${password}@cluster0.ud2izsh.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    async function postOne() {
        try {
            await client.connect();

            vars = {
                name: request.body.name,
                ingredients: request.body.ingredients,
            }
            await insertStuff(client, databaseAndCollection, vars)
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }

    async function insertStuff(client, databaseAndCollection, vars) {

        const result = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .insertOne(vars);
    }

    await postOne().catch(console.error);
    await postTwo().catch(console.error);
    
    let recipes = await getRecipe();
    
    let variables = {
        name: stuff.name,
        recipe: lineRecipe(recipes)
    }

    response.render("searchRecipe", variables);
});

function lineRecipe(listObj) {
    let str = "";
    listObj.data.forEach(recipe => {
        let temp ="";
        recipe.missedIngredients.forEach(ing => {temp += ing});
        str += `<h2>${recipe.title}</h2><img src="${recipe.image}"><br><br>Missing ingredients: ${recipe.missedIngredientCount}<br><hr>`
    });
    return str;
}
    


async function postTwo() {
    const uri = `mongodb+srv://${userName}:${password}@cluster0.ud2izsh.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    let result;
    try {
        await client.connect();
        const cursor = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .find({});
        result = await cursor.toArray();
        stuff = result[result.length - 1];
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    stuff = result[result.length - 1];
}

app.post("/clear", async (request, response) => {
    await clear();
    response.render("index");
});

async function clear() {
    const uri = `mongodb+srv://${userName}:${password}@cluster0.ud2izsh.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    await client.connect();
    const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
    await client.close();
}

app.listen(PORT);