const bcrypt = require('bcrypt');

const password = 'password123';
const hash = '$2b$10$NUsbrNZD61ZRSPQBr0M8OeYuzqYekAygQ46Gm6etdCPRBXrL9vyDG';

async function verify() {
  const match = await bcrypt.compare(password, hash);
  console.log(`Password 'password123' match: ${match}`);
  
  const newHash = await bcrypt.hash(password, 10);
  console.log(`New hash for 'password123': ${newHash}`);
}

verify();
