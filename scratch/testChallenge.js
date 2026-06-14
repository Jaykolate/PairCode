import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:10000';

const SOLVERS = {
    "Two Sum": `
import sys
lines = sys.stdin.read().strip().split('\\n')
if len(lines) >= 2:
    target = int(lines[0].strip())
    nums = [int(x) for x in lines[1].strip().split(',')]
    seen = {}
    for idx, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            print(f"{seen[diff]} {idx}")
            break
        seen[num] = idx
`,
    "Palindrome Check": `
import sys
val = sys.stdin.read().strip()
print("True" if val == val[::-1] else "False")
`,
    "Fizz Buzz": `
import sys
n = int(sys.stdin.read().strip())
for i in range(1, n + 1):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`,
    "Fibonacci Number": `
import sys
n = int(sys.stdin.read().strip())
a, b = 0, 1
for _ in range(n):
    a, b = b, a + b
print(a)
`,
    "Valid Parentheses": `
import sys
s = sys.stdin.read().strip()
stack = []
mapping = {")": "(", "}": "{", "]": "["}
possible = True
for char in s:
    if char in mapping:
        top = stack.pop() if stack else '#'
        if mapping[char] != top:
            possible = False
            break
    else:
        stack.append(char)
print("True" if possible and not stack else "False")
`,
    "Reverse a String": `
import sys
val = sys.stdin.read()
if val.endswith('\\n'):
    val = val[:-1]
print(val[::-1], end="")
`,
    "Single Number": `
import sys
nums = [int(x) for x in sys.stdin.read().strip().split(',')]
res = 0
for n in nums:
    res ^= n
print(res)
`,
    "Factorial": `
import sys
import math
n = int(sys.stdin.read().strip())
print(math.factorial(n))
`,
    "Valid Anagram": `
import sys
lines = sys.stdin.read().strip().split('\\n')
if len(lines) >= 2:
    s, t = lines[0].strip(), lines[1].strip()
    print("True" if sorted(s) == sorted(t) else "False")
`,
    "Length of Last Word": `
import sys
s = sys.stdin.read().strip()
words = s.split()
print(len(words[-1]) if words else 0)
`,
    "Binary Search": `
import sys
lines = sys.stdin.read().strip().split('\\n')
if len(lines) >= 2:
    target = int(lines[0].strip())
    nums = [int(x) for x in lines[1].strip().split(',')]
    try:
        print(nums.index(target))
    except ValueError:
        print(-1)
`,
    "Plus One": `
import sys
digits = [x.strip() for x in sys.stdin.read().strip().split(',')]
num = int("".join(digits)) + 1
print(",".join(list(str(num))))
`,
    "Search Insert Position": `
import sys
lines = sys.stdin.read().strip().split('\\n')
if len(lines) >= 2:
    target = int(lines[0].strip())
    nums = [int(x) for x in lines[1].strip().split(',')]
    idx = 0
    while idx < len(nums) and nums[idx] < target:
        idx += 1
    print(idx)
`,
    "Climbing Stairs": `
import sys
n = int(sys.stdin.read().strip())
if n <= 2:
    print(n)
else:
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    print(b)
`,
    "Maximum Subarray": `
import sys
nums = [int(x) for x in sys.stdin.read().strip().split(',')]
max_so_far = nums[0]
curr_max = nums[0]
for x in nums[1:]:
    curr_max = max(x, curr_max + x)
    max_so_far = max(max_so_far, curr_max)
print(max_so_far)
`
};

async function registerUser(name, email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
        if (data.error && data.error.includes('exists')) {
            const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            return await loginRes.json();
        }
        throw new Error(data.error || 'Failed to register');
    }
    return data;
}

async function runTest() {
    console.log('🏁 Starting Challenge Mode Integration Test...');

    try {
        // 1. Register/Login two players
        console.log('👤 Registering Player 1 (Alice)...');
        const p1Data = await registerUser('Alice Test', 'alice_test@example.com', 'password123');
        console.log('👤 Registering Player 2 (Bob)...');
        const p2Data = await registerUser('Bob Test', 'bob_test@example.com', 'password123');

        console.log(`✅ Players authenticated.`);

        // 2. Initialize Sockets
        console.log('🔌 Connecting Sockets...');
        const s1 = io(BASE_URL, {
            path: '/socket.io',
            transports: ['websocket'],
            forceNew: true,
            auth: { token: p1Data.token }
        });

        const s2 = io(BASE_URL, {
            path: '/socket.io',
            transports: ['websocket'],
            forceNew: true,
            auth: { token: p2Data.token }
        });

        // Connect sockets
        await new Promise((resolve) => s1.on('connect', resolve));
        await new Promise((resolve) => s2.on('connect', resolve));
        console.log('✅ Sockets connected.');

        let matchId = null;
        let problemId = null;

        const waitForMatch = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Matchmaking timed out after 30s')), 30000);

            s1.on('match-found', (data) => {
                console.log('🎯 Alice: Match Found!', data);
                matchId = data.matchId;
                problemId = data.problemId;
            });

            s2.on('match-found', (data) => {
                console.log('🎯 Bob: Match Found!', data);
                if (matchId && matchId === data.matchId) {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });

        // 3. Lobby Matchmaking (Private duel test)
        console.log('🔄 Creating private duel room (Alice)...');
        const roomCode = 'TEST12';
        s1.emit('create-private-match', { roomId: roomCode });

        // Wait a brief moment and join
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log('🔄 Joining private duel room (Bob)...');
        s2.emit('join-private-match', { roomId: roomCode });

        await waitForMatch;
        console.log(`✅ Private Match successfully created! Match ID: ${matchId}`);

        // 4. Join Challenge Rooms
        s1.emit('join-challenge-room', { matchId });
        s2.emit('join-challenge-room', { matchId });

        // Fetch match details via REST API
        console.log('🌐 Testing REST API GET /api/challenge/match/:matchId...');
        const apiRes = await fetch(`${BASE_URL}/api/challenge/match/${matchId}`, {
            headers: { Authorization: `Bearer ${p1Data.token}` }
        });
        const matchDetails = await apiRes.json();
        if (!apiRes.ok) throw new Error('API failed');
        console.log(`✅ REST API fetched successfully. Problem: "${matchDetails.problem.title}" (Difficulty: ${matchDetails.problem.difficulty})`);

        // Get solver code
        const solverCode = SOLVERS[matchDetails.problem.title];
        if (!solverCode) {
            throw new Error(`No solver registered for problem: ${matchDetails.problem.title}`);
        }

        // 5. Test Code execution (Run against visible test cases)
        console.log('▶ Testing "run-code" socket event (Alice)...');
        s1.emit('run-code', { matchId, code: solverCode });
        
        const runOutput = await new Promise((resolve) => {
            s1.on('run-result', (data) => {
                resolve(data);
            });
        });
        console.log('✅ run-code result received:\n', runOutput.output);

        // 6. Test final submission & win detection (Alice submits correct answer, wins immediately)
        console.log('🚀 Testing "submit-code" final submission (Alice)...');
        s1.emit('submit-code', { matchId, code: solverCode });

        const submissionResult = await new Promise((resolve) => {
            s1.on('opponent-progress', (data) => {
                console.log('📊 Progress update:', data);
            });
            s1.on('match-result', (data) => {
                resolve(data);
            });
        });

        console.log('🎉 Match completed! Final Result:', submissionResult);

        // Cleanup
        s1.disconnect();
        s2.disconnect();
        console.log('🏆 Integration Test Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

runTest();
