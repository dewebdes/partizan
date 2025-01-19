const fs = require('node:fs');
const path = require('path');
const readline = require('readline');
const Promise = require('bluebird');

// Function to shuffle an array
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Create interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prompt the user for input
rl.question('Enter the worker count: ', (wc) => {
    rl.question('Enter the main wordlist file path: ', (filePath) => {
        // Read the wordlist
        const words = fs.readFileSync(filePath, 'utf8');
        const wordlist = words.split('\n');

        // Shuffle the wordlist to randomize it
        const shuffledWordlist = shuffleArray(wordlist);

        // Calculate the number of words per chunk
        const wordlistLength = shuffledWordlist.length;
        const outc = wc * 100000;
        const numChunks = Math.ceil(wordlistLength / outc);

        // Create output folder with timestamp name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFolder = path.join(__dirname, 'output', timestamp);
        fs.mkdirSync(outputFolder, { recursive: true });

        // Function to create a random wordlist
        async function createRandomWordlist(chunkIndex, chunkWords) {
            const outstr = chunkWords.join('\n');
            fs.writeFileSync(path.join(outputFolder, `sub_rand_${chunkIndex + 1}.txt`), outstr, 'utf-8');
            console.log(`Chunk ${chunkIndex + 1} saved.`);
        }

        // Generate all random wordlists
        (async () => {
            for (let i = 0; i < numChunks; i++) {
                const start = i * outc;
                const end = start + outc;
                const chunkWords = shuffledWordlist.slice(start, end);
                await createRandomWordlist(i, chunkWords);

                // Log progress percentage
                const progress = Math.floor(((i + 1) / numChunks) * 100);
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`Processing: ${progress}% complete`);
            }
            console.log(); // Move to the next line after all chunks are created
            console.log('All chunks created successfully!');
            rl.close();
        })();
    });
});
