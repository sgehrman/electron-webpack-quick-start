// Initial welcome page. Delete the following line to remove it.
'use strict';
const vueScript = document.createElement('script');
vueScript.setAttribute('type', 'text/javascript'), vueScript.setAttribute('src', 'https://unpkg.com/vue'), vueScript.onload = init, document.head.appendChild(vueScript);

var Transport = require('@ledgerhq/hw-transport-node-hid').default;
var Str = require('@ledgerhq/hw-app-str').default;
var StellarSdk = require('stellar-sdk');

function init() {
  Vue.config.devtools = false, Vue.config.productionTip = false, new Vue({
    data() {
      return {
        transport: null,
        str: null,
        publicKey: null
      }
    },
    methods: {
      doConnect() {
        return Transport.create(180000)
          .then((t) => {
            this.transport = t;
            this.transport.setDebugMode(true);
            this.str = new Str(transport);
          })
          .catch((error) => {
            console.log(JSON.stringify(error));
          });
      },

      connect() {
        if (this.str) {
          return this.str.getAppConfiguration()
            .catch(() => {
              this.transport.close();
              this.str = null;
              return this.doConnect();
            });
        } else {
          return this.doConnect();
        }
      },

      getPublicKey() {
        this.connect()
          .then(() => {
            this.str.getPublicKey("44'/148'/0'")
              .then((result) => {
                publicKey = result.publicKey;
                console.log(publicKey);
              });
          })
          .catch(() => {
            console.log('error connecting');
          });
      },

      loadAccount(publicKey) {
        const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
        return server.loadAccount(publicKey);
      },

      inflation(account) {
        return new StellarSdk.TransactionBuilder(account)
          .addOperation(StellarSdk.Operation.inflation())
          .addMemo(StellarSdk.Memo.text("maximum memo length 28 chars"))
          .build();
      },

      signTx() {
        this.connect().then(() => {
          this.loadAccount(publicKey).then((account) => {
            StellarSdk.Network.useTestNetwork();
            const tx = inflation(account);
            console.log('signing transaction');
            try {
              this.str.signTransaction("44'/148'/0'", tx.signatureBase()).then((s) => {
                const txHash = tx.hash();
                const keyPair = StellarSdk.Keypair.fromPublicKey(publicKey);
                if (keyPair.verify(txHash, s['signature'])) {
                  console.log('Success! Good signature');
                } else {
                  console.error('Failure: Bad signature');
                }
              });
            } catch (e) {
              console.log(e);
            }
          });
        }).catch(() => {
          console.log('error connecting');
        });
      }
    },
    template: `<div>
    <h1>Hello World!</h1>
    <div>&nbsp;</div>
    <div id="addressForm">
      <input type="text" id="bip32Path" value="44'/148'/0'">
      <input id='getPublicKey' type="button" @click="getPublicKey()" value="Get Public Key">
      <!--<input id='confirmPublicKey' type="button" onClick="getPublicKey(true)" value="Confirm Public Key">-->
    </div>
    <div>&nbsp;</div>
    <div id="signForm">
      <input id='signTx' type="button" @click="signTx()" value="Sign">
      </div>
      </div>
    `
  }).$mount('#app')
}
