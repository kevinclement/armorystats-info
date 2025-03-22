/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { instrument } from "@microlabs/otel-cf-workers"



const handler = {
	async fetch(request, env, ctx) {
		
		let client_id = `${env.CLIENT_ID}`
		let client_secret = `${env.CLIENT_SECRET}`

		let auth = btoa(client_id + ":" + client_secret).toString('base64')

		let debug = env.SERVICE_NAME;
		var now = new Date();
		let usedCachedToken = false;

		// if we don't have a token or its expired, lets go get another one
		if (!env.access_token || now > env.access_token_expires_date) {
			console.log('fetching new token...' + env.access_token)
			let headers = {
				'Authorization': 'Basic ' + auth,
				'Content-Type': 'application/x-www-form-urlencoded'
			}
			
			const init = {
				method: 'POST',
				headers: headers,
				body: 'grant_type=client_credentials'
			}
		
			const response = await fetch('https://us.battle.net/oauth/token', init)
			const json = await response.json();
			var now = new Date();
			var tenMins = 10 * 60 * 1000;
		
			// store in global memory
			env.access_token = json.access_token;
			env.access_token_expires = now.getTime() + (json.expires_in * 1000) - tenMins;
			env.access_token_expires_date = new Date(env.access_token_expires);		
			
			console.log(`got json: ${json.access_token} token: ${env.access_token} expires: ${env.access_token_expires} date: ${env.access_token_expires_date}`);
			debug += `FRESH: ${env.access_token_expires_date}`;
								
		} else {
			usedCachedToken = true;
			console.log(`using cached token: ${env.access_token} expires: ${env.access_token_expires} date: ${env.access_token_expires_date}`)
			debug += `EXISTING: ${env.access_token_expires_date}`;
	  	}

		let url_match = null;
  		let url_match_live = request.url.match(/https?:\/\/.*\.(dev|info)\/(.*?)\/(.*?)\/(.*?)\/(.*)/i);
  		let url_match_dev  = request.url.match(/https?:\/\/(127.0.0.1:8787)\/(.*?)\/(.*?)\/(.*?)\/(.*)/i);
  		if (url_match_live) {
			url_match = url_match_live;
  		} else if (url_match_dev) {
			url_match = url_match_dev;
  		} else {
			return new Response('Bad Request', { status: 400, statusText: 'Bad Request: ' + request.url });
		}

		let region = url_match[2].toLowerCase();
  		let realm = url_match[3].toLowerCase();
  		let character = url_match[4].toLowerCase();
  		let site = url_match[5];
  		if (site) {
    		site = `/${site.toLowerCase()}`
  		}
	 	
		console.log(`region: ${region} realm: ${realm} character: ${character} site: ${site}`)
		let url = `https://${region}.api.blizzard.com/profile/wow/character/${realm}/${character}${site}?namespace=profile-${region}`;
		try {
			let resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + env.access_token } } )
			let api_response = new Response(resp.body, resp);
		
			if (resp.status == 530) {
				console.error('530' + resp.body);
			}
			// Add CORS so we can call it from our site
			api_response.headers.set("Access-Control-Allow-Origin", "*")
			api_response.headers.set("X-Debug", debug)
			
			return api_response

		} catch (error) {
			console.error(error)
			return new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
		}		
	},
};

const config = (env, _trigger) => {
	return {
	  exporter: {
		url: "https://otel.baselime.io/v1",
		headers: { "x-api-key": env.BASELIME_API_KEY }
	  },
	  service: { name: env.SERVICE_NAME }
	}
  }
  
export default instrument(handler, config)
