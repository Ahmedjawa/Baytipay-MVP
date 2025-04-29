const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-keys.json'))
});

exports.sendNotification = async (userId, message) => {
  const tokens = await getDeviceTokens(userId); // À implémenter
  
  await admin.messaging().sendMulticast({
    tokens,
    notification: {
      title: 'Baytipay Notification',
      body: message
    }
  });
};