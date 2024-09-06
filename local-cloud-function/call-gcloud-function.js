require('dotenv').config();
const { execSync } = require('child_process');
const fetch = require('node-fetch');

const cloudFunctionUrl = process.env.CLOUD_FUNCTION_URL;

async function getIdentityToken() {
    try {
        // Must have an activated service account (gcloud auth activate-service-account ACCOUNT_EMAIL --key-file PATH_TO_JSON_KEY)
        // Execute the gcloud command to get the identity token (NOT ACCESS TOKEN)
        const token = execSync('gcloud auth print-identity-token robert-lam@invitemap-432719.iam.gserviceaccount.com --audiences="https://us-central1-invitemap-432719.cloudfunctions.net/processInvites"', { encoding: 'utf-8' }).trim();
        return token;
    } catch (error) {
        console.error('Error obtaining identity token:', error.message);
        process.exit(1);
    }
}

async function callCloudFunction(action, fromAddress, toAddress, wager) {
    try {
        const token = await getIdentityToken();

        // Prepare the request URL and options
        let url = new URL(cloudFunctionUrl);
        let options = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        };

        if (action === 'getInvites') {
            url.searchParams.append('action', action);
            if (fromAddress) url.searchParams.append('from', fromAddress);
            options.method = 'GET'; // No body with GET requests
        } else {
            // POST actions (addInvite, deleteInvite)
            options.method = 'POST';
            let requestBody = {
                action: action,
                from: fromAddress,
                to: toAddress,
                wager: wager,
            };
            options.body = JSON.stringify(requestBody);
        }

        const response = await fetch(url, options);

        // Parse the response as text (or use response.json() if expecting JSON)
        const data = await response.text();
        console.log('Response from Cloud Function:', data);
        return data;
    } catch (error) {
        console.error('Error calling Cloud Function:', error.message);
        return error;
    }
}

async function main() {
    const args = process.argv.slice(2);

    const actionFlag = args.indexOf('--action');
    const fromAddressFlag = args.indexOf('--from');
    const toAddressFlag = args.indexOf('--to');
    const wagerFlag = args.indexOf('--wager');

    if (actionFlag === -1) {
        console.error('Error: --action flag is required.');
        process.exit(1);
    }

    const action = args[actionFlag + 1];
    const fromAddress = fromAddressFlag !== -1 ? args[fromAddressFlag + 1] : null;
    const toAddress = toAddressFlag !== -1 ? args[toAddressFlag + 1] : null;
    const wager = wagerFlag !== -1 ? args[wagerFlag + 1] : null;

    if (action === 'getInvites' && !fromAddress) {
        console.error('Error: --from flag is required for getInvites action.');
        process.exit(1);
    }

    if ((action === 'addInvite' || action === 'deleteInvite') && (!fromAddress || !toAddress || !wager)) {
        console.error('Error: --from, --to, and --wager flags are required for addInvite and deleteInvite actions.');
        process.exit(1);
    }

    await callCloudFunction(action, fromAddress, toAddress, wager);
}

main().catch(console.error);
