import { config } from 'dotenv';
config({ path: '../.env' });
import pkg from '@slack/bolt';
const { App } = pkg;

// Constructor for a bolt app
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_SOCKET_TOKEN,
    port: process.env.PORT || 3000
});

// get user names 

async function listAllUsers(app) {
    try {
      const result = await app.client.users.list();
      return result.members.map(user => ({
        id: user.id,
        name: user.name,
        real_name: user.real_name
      }));
    } catch (error) {
      console.error("Fehler beim Abrufen der Benutzerliste:", error);
      return [];
    }
  }

  async function listAllUsersb(app) {
    try {
        const result = await app.client.users.list();
        return result.members; // Return full members array without mapping
    } catch (error) {
        console.error("Fehler beim Abrufen der Benutzerliste:", error);
        return [];
    }
}

  
  listAllUsers(app).then(users => console.log(users));

  // Now store the users or find() them
  // use split(@)[0] on deskly members to match the email on the name-property

// const user = users.members.find(u => u.name === userName);

// Starts the app and keeps it running TODO Figure out the best approach to keep this running at all times. Backend stuff... TODO
(async () => {
  await app.start();

  app.logger.info('Bolt is running!');
})();