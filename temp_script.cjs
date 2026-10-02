const fs = require('fs');
let c = fs.readFileSync('src/store/partyStore.ts', 'utf8');

c = c.replace(/        if \(joinError\) \{\s*if \(joinError\.code !== '23505'\) throw joinError;\s*\} else \{/, 
`        if (joinError) {
          if (joinError.code !== '23505') throw joinError;
          await get().fetchParties();
          return { partyId, alreadyJoined: true };
        } else {`);

fs.writeFileSync('src/store/partyStore.ts', c);
