const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

exports.inviteMap = async (req, res) => {
    console.log("Received request:", req.query || req.body);

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const auth = new JWT({
            email: process.env.SERVICE_ACCOUNT_EMAIL,
            key: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1oihqnNC6xlbLK65NQtkXchTj4J0u_es2tYnsvYeneCw';

        async function getInvites(toAddress) {
            try {
                const range = 'InviteMap!A2:F';
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: range,
                });

                let invites = [];
                const rows = response.data.values;
                if (rows) {
                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i][1] == toAddress) {
                            invites.push({
                                fromAddress: rows[i][0],
                                toAddress: rows[i][1],
                                wager: rows[i][2],
                                nonce: rows[i][3],
                                signature: rows[i][4]
                            });
                        }
                    }
                }

                if (invites.length > 0) {
                    return invites;
                } else {
                    return 'No matching invites found';
                }

            } catch (error) {
                console.error('Error accessing spreadsheet:', error);
                return 'Error accessing spreadsheet';
            }
        }

        async function addInvite(fromAddress, toAddress, wager, nonce, signature) {
            try {

                const lowerFromAddress = fromAddress.toLowerCase();
                const lowerToAddress = toAddress.toLowerCase();

                const value = [lowerFromAddress, lowerToAddress, wager, nonce, signature];

                const range = 'InviteMap!A:F';
                const resource = {
                    values: [value],
                };

                const response = await sheets.spreadsheets.values.append({
                    spreadsheetId: spreadsheetId,
                    range: range,
                    valueInputOption: 'RAW',
                    resource: resource,
                });

                if (response.data.updates) {
                    console.log('Invite added:', response.data.updates);
                    return 'Invite added successfully';
                } else {
                    return 'Failed to add invite';
                }

            } catch (error) {
                console.error('Error adding invite:', error);
                return 'Error adding invite';
            }
        }

        async function deleteInvite(fromAddress, toAddress, wager) {
            try {
                const range = 'InviteMap!A:C';
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: range,
                });

                const rows = response.data.values;
                if (rows) {
                    let rowIndex = -1;
                    for (let i = 0; i < rows.length; i++) {
                        if (
                            rows[i][0] === fromAddress &&
                            rows[i][1] === toAddress &&
                            rows[i][2] == wager 
                        ) {
                            rowIndex = i + 1;
                            break;
                        }
                    }

                    if (rowIndex !== -1) {
                        const range = `InviteMap!A${rowIndex}:F${rowIndex}`;
                        await sheets.spreadsheets.values.update({
                            spreadsheetId,
                            range: range,
                            valueInputOption: 'RAW',
                            resource: {
                                values: [["", "", "", "", ""]],
                            }
                        });

                        console.log(`Row ${rowIndex} deleted successfully.`);
                        return 'Invite deleted successfully';
                    } else {
                        return 'No matching row found';
                    }
                } else {
                    return 'No matching row found';
                }

            } catch (error) {
                console.error('Error deleting invite:', error);
                return 'Error deleting invite';
            }
        }

        async function getNonce() {
            try {
                const range = 'NonceManager!A2';
                
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: range,
                });

                let nonce = parseInt(response.data.values[0][0], 10);

                nonce += 1;

                // Update the nonce value in the sheet
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: range,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[nonce]],
                    },
                });

                return nonce; // Return the updated nonce

            } catch (error) {
                console.error('Error accessing nonce:', error);
                return 'Error accessing nonce';
            }
        }

        if (req.method === "GET") {
            const action = req.query.action;
            try {
                if (action === 'getInvites') {
                    const toAddress = req.query.to;
                    if (!toAddress) {
                        res.status(400).send('Missing "to" parameter');
                        return;
                    }
                    const result = await getInvites(toAddress);
                    res.status(200).send(result);
                } else if (action === 'getNonce') {
                    const nonce = await getNonce();
                    if (nonce !== undefined) {
                        res.status(200).send({ nonce });
                    } else {
                        res.status(500).send('Error fetching nonce');
                    }
                } else {
                    res.status(400).send('Invalid action parameter');
                }
            } catch (error) {
                console.error('Error handling GET request:', error);
                res.status(500).send('Server error');
            }
            
        } else if (req.method === "POST") {
            const { action, from, to, wager, nonce, signature } = req.body;

            let result;
            if (action === "add") {
                result = await addInvite(from, to, wager, nonce, signature);
            } else if (action === "delete") {
                result = await deleteInvite(from, to, wager);
            } else {
                result = 'Invalid action';
                res.status(400).send(result);
                return;
            }

            res.status(200).send(result);

        } else {
            res.status(405).send('Method Not Allowed');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};