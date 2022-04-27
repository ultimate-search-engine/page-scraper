import {Browser, Page, PuppeteerLifeCycleEvent} from "puppeteer";

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

const bodyParser = require("body-parser")
const express = require('express');

const app = express();

app.use(bodyParser.json());

type HttpRes = {
    url: string,
    html: string,
    status: number
}

const port = 8080

type scrape = { url: string, html: string, hasResponse: boolean }

const browsers = [] as Browser[]

puppeteer.use(StealthPlugin())
addNewBrowser().then(() => {
    main()
})

async function addNewBrowser() {
    browsers.push(await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
        ]
    }))
}

function main() {
    console.log("Server started on port:", port)
    app.post('/crawler', async function (request: { body: any; }, response: any) {
        console.log("scraping url:", request.body.url)

        const pageCtx = await browsers[browsers.length - 1].newPage();
        let result: HttpRes

        try {
            let page = await scrape(pageCtx, request.body.url)
            if (page != null && page.hasResponse) result = {url: page.url, html: page.html, status: 200}
            else result = {url: request.body.url, html: "", status: 404}

        } catch (e: any) {
            console.log(e)
            result = {url: request.body.url, html: "", status: 400}
        }
        response.send(result)
        await pageCtx.close()
    });

    app.get('/', function (request: { body: any; }, response: { send: (arg0: any) => void; }) {
        response.send('Welcome to the page scraper! Please make a POST request to /crawler with a JSON body' +
            ' containing a "url" property. Example: curl -d \'{"url":"https://google.com"}\' -H "Content-Type:' +
            ' application/json" -X POST [Server URL]/crawler')
    });

    app.listen(port)
}


// async function fetchToUrl(content: { url: string, html: string, status: number }, url: string) {
//     axios.put(url, content, {
//         headers: {
//             "Content-Type": "application/json"
//         }
//     }).then(() => {
//     }).catch(console.error)
// }


async function scrape(page: Page, url: string, waitUntil: PuppeteerLifeCycleEvent = "networkidle0"): Promise<scrape | null> {
    await page.setRequestInterception(true);
    page.on('request', (request: { resourceType: () => string; abort: () => void; continue: () => void; }) => {
        if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
            request.abort();
        } else {
            request.continue();
        }
    });

    page.on('response', () => {
        hasResponse = true;
    })

    let hasResponse = false

    const goto = page.goto(url, {
        waitUntil: waitUntil,
        timeout: 25_000
    }).catch(() => {
    }).then(() => {
    })

    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 30_000));
    await Promise.race([goto, timeout])

    try {
        return {url: page.url(), html: await page.content(), hasResponse};
    } catch (e) {
        console.log(e)
        const browserPos = browsers.length - 1
        addNewBrowser().then(_ => {
            new Promise(resolve => setTimeout(() => resolve(null), 30_000)).then(_ => {
                console.log('Closing old browser')
                browsers[browserPos].close()
            })
        })
        return null;
    }
}
