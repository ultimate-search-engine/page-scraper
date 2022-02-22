import * as puppeteer from "puppeteer";

import bodyParser from "body-parser";
import express from 'express';

const app = express();
app.use(bodyParser.json());

type Request = {
    url: string,
    html: string,
    status: number
}

const port = 8080

type scrape = { url: string, html: string, hasResponse: boolean } | null

puppeteer.launch({
    headless: true,
    args: [
        "--no-sandbox",
    ]
}).then(browser => {
    console.log("Server started on port:", port)
    app.post('/crawler', async function (request: { body: any; }, response: any) {
        console.log("scraping url:", request.body.url)
        try {
            let result: Request
            let page = await scrape(browser, request.body.url)
            if (page != null && page.hasResponse) {
                result = {url: page.url, html: page.html, status: 200}
            } else {
                result = {url: request.body.url, html: "", status: 404}
            }
            response.send(result)
        } catch (e: any) {
            console.log(e)
            return response.send({url: request.body.url, html: "", status: 400})
        }
    });

    app.get('/', function (request: { body: any; }, response: { send: (arg0: any) => void; }) {
        response.send('Welcome to the page scraper! Please make a POST request to /crawler with a JSON body' +
            ' containing a "url" property. Example: curl -d \'{"url":"https://google.com"}\' -H "Content-Type:' +
            ' application/json" -X POST [Server URL]/crawler')
    });

    app.listen(port)
});


// async function fetchToUrl(content: { url: string, html: string, status: number }, url: string) {
//     axios.put(url, content, {
//         headers: {
//             "Content-Type": "application/json"
//         }
//     }).then(() => {
//     }).catch(console.error)
// }


async function scrape(browser: puppeteer.Browser, url: string): Promise<scrape> {
    const page: puppeteer.Page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
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
    let done = false

    const goto = page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 18_000
    }).catch(() => {
    }).then(() => {
        done = true
    })


    const timeout = new Promise(resolve => {
        setTimeout((e) => {
            resolve(e)
            if (!done) {
                console.log("Url:", url, "timed out")
            }
        }, 15_000)
    });

    await Promise.race([timeout, goto])

    try {
        const html = await page.content();
        await page.close();
        return {url, html, hasResponse};
    } catch (e) {
        console.log(e)
        await page.close();
        return null;
    }
}
