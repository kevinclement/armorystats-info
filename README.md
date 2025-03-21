As part of the new developer portal, blizzard removed ability to hit API without a OATH token.  This is a pain for simple site like SA, as I don't want to ask people to credential to battle net.  To work around this we had to stand up a proxy api server.  I did this in cloudflare for now.

TO TEST DEV:
  ```
  npm run dev
  curl http://127.0.0.1:8787/us/proudmoore/marko/
  ```

  TO TEST production:
  ```  
  curl https://armorystats.info/us/proudmoore/marko/
  ```

  TO DEPLOY to production:
  ```  
  npm run deploy
  ```
  

See index.js for current version that is deployed.