import mongoose from 'mongoose';
import Problem from './models/Problem.js';
import 'dotenv/config';

const problems = [
  {
    title: "Two Sum",
    description: "Write a program that finds two numbers in a list that add up to a specific target.\n\nInput format:\n- The first line contains the target sum.\n- The second line contains a comma-separated list of integers.\n\nOutput format:\n- Print a space-separated pair of indices of the two numbers that add up to the target (e.g. `0 1`). Order does not matter.",
    difficulty: "Easy",
    constraints: "All inputs are valid. There is exactly one solution.",
    visibleTestCases: [
      { input: "9\n2,7,11,15", expectedOutput: "0 1" },
      { input: "6\n3,2,4", expectedOutput: "1 2" }
    ],
    hiddenTestCases: [
      { input: "6\n3,3", expectedOutput: "0 1" },
      { input: "10\n1,2,5,5,8", expectedOutput: "2 3" },
      { input: "100\n10,20,30,40,60,90", expectedOutput: "0 5" }
    ],
    language: "python"
  },
  {
    title: "Palindrome Check",
    description: "Determine if a given input string (or number) is a palindrome (reads the same forwards and backwards).\n\nInput format:\n- A single string or number.\n\nOutput format:\n- Print `True` if it is a palindrome, otherwise print `False`.",
    difficulty: "Easy",
    constraints: "Length of string <= 1000.",
    visibleTestCases: [
      { input: "121", expectedOutput: "True" },
      { input: "racecar", expectedOutput: "True" },
      { input: "hello", expectedOutput: "False" }
    ],
    hiddenTestCases: [
      { input: "a", expectedOutput: "True" },
      { input: "ab", expectedOutput: "False" },
      { input: "12321", expectedOutput: "True" },
      { input: "123421", expectedOutput: "False" }
    ],
    language: "python"
  },
  {
    title: "Fizz Buzz",
    description: "Write a program that prints numbers from 1 to N. For multiples of 3 print 'Fizz', for multiples of 5 print 'Buzz', and for multiples of both print 'FizzBuzz'. Otherwise, print the number.\n\nInput format:\n- A single integer N.\n\nOutput format:\n- Print each result on a new line.",
    difficulty: "Easy",
    constraints: "1 <= N <= 100",
    visibleTestCases: [
      { input: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz" }
    ],
    hiddenTestCases: [
      { input: "3", expectedOutput: "1\n2\nFizz" },
      { input: "15", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz" }
    ],
    language: "python"
  },
  {
    title: "Fibonacci Number",
    description: "Write a program to compute the Nth Fibonacci number (0-indexed: F(0)=0, F(1)=1, F(2)=1, F(n)=F(n-1)+F(n-2)).\n\nInput format:\n- A single integer N.\n\nOutput format:\n- The Nth Fibonacci number.",
    difficulty: "Easy",
    constraints: "0 <= N <= 30",
    visibleTestCases: [
      { input: "2", expectedOutput: "1" },
      { input: "4", expectedOutput: "3" },
      { input: "9", expectedOutput: "34" }
    ],
    hiddenTestCases: [
      { input: "0", expectedOutput: "0" },
      { input: "1", expectedOutput: "1" },
      { input: "20", expectedOutput: "6765" },
      { input: "30", expectedOutput: "832040" }
    ],
    language: "python"
  },
  {
    title: "Valid Parentheses",
    description: "Determine if a string of brackets is valid. Brackets must close in the correct order, and be of the same type.\n\nInput format:\n- A single string containing bracket characters '()[]{}'.\n\nOutput format:\n- Print `True` if valid, otherwise print `False`.",
    difficulty: "Medium",
    constraints: "Length of string <= 10^4.",
    visibleTestCases: [
      { input: "()", expectedOutput: "True" },
      { input: "()[]{}", expectedOutput: "True" },
      { input: "(]", expectedOutput: "False" }
    ],
    hiddenTestCases: [
      { input: "([)]", expectedOutput: "False" },
      { input: "{[]}", expectedOutput: "True" },
      { input: "(((({[[()]]}))))", expectedOutput: "True" },
      { input: "((((", expectedOutput: "False" }
    ],
    language: "python"
  },
  {
    title: "Reverse a String",
    description: "Write a program that takes a string and prints it in reverse order.\n\nInput format:\n- A single string.\n\nOutput format:\n- The reversed string.",
    difficulty: "Easy",
    constraints: "Length <= 1000.",
    visibleTestCases: [
      { input: "hello", expectedOutput: "olleh" },
      { input: "PairCode", expectedOutput: "edoCriaP" }
    ],
    hiddenTestCases: [
      { input: "", expectedOutput: "" },
      { input: "a", expectedOutput: "a" },
      { input: "A man a plan a canal Panama", expectedOutput: "amanaP lanac a nalp a nam A" }
    ],
    language: "python"
  },
  {
    title: "Single Number",
    description: "Given a non-empty array of integers where every element appears twice except for one, find that single one.\n\nInput format:\n- A comma-separated list of integers.\n\nOutput format:\n- The single integer.",
    difficulty: "Easy",
    constraints: "Linear time complexity, constant extra space.",
    visibleTestCases: [
      { input: "2,2,1", expectedOutput: "1" },
      { input: "4,1,2,1,2", expectedOutput: "4" }
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "1" },
      { input: "-1,-1,-2", expectedOutput: "-2" },
      { input: "9,5,1,2,5,2,9", expectedOutput: "1" }
    ],
    language: "python"
  },
  {
    title: "Factorial",
    description: "Write a program that computes the factorial of N (N!).\n\nInput format:\n- An integer N.\n\nOutput format:\n- The factorial value.",
    difficulty: "Easy",
    constraints: "0 <= N <= 20",
    visibleTestCases: [
      { input: "5", expectedOutput: "120" },
      { input: "0", expectedOutput: "1" }
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "1" },
      { input: "10", expectedOutput: "3628800" },
      { input: "15", expectedOutput: "1307674368000" }
    ],
    language: "python"
  },
  {
    title: "Valid Anagram",
    description: "Given two strings s and t, determine if t is an anagram of s.\n\nInput format:\n- The first line contains string s.\n- The second line contains string t.\n\nOutput format:\n- Print `True` if t is an anagram of s, otherwise print `False`.",
    difficulty: "Easy",
    constraints: "s and t consist of lowercase English letters.",
    visibleTestCases: [
      { input: "anagram\nnagaram", expectedOutput: "True" },
      { input: "rat\ncar", expectedOutput: "False" }
    ],
    hiddenTestCases: [
      { input: "a\na", expectedOutput: "True" },
      { input: "ab\nba", expectedOutput: "True" },
      { input: "listen\nsilent", expectedOutput: "True" }
    ],
    language: "python"
  },
  {
    title: "Length of Last Word",
    description: "Given a string s consisting of words and spaces, return the length of the last word in the string.\n\nInput format:\n- A single string of words and spaces.\n\nOutput format:\n- An integer representing the length of the last word.",
    difficulty: "Easy",
    constraints: "s contains at least one word.",
    visibleTestCases: [
      { input: "Hello World", expectedOutput: "5" },
      { input: "   fly me   to   the moon  ", expectedOutput: "4" }
    ],
    hiddenTestCases: [
      { input: "a", expectedOutput: "1" },
      { input: "luffy is still joyboy", expectedOutput: "6" },
      { input: "spaces      ", expectedOutput: "6" }
    ],
    language: "python"
  },
  {
    title: "Binary Search",
    description: "Given a sorted array of integers and a target value, return the index of the target if found, or -1 if not.\n\nInput format:\n- The first line contains the target.\n- The second line contains a comma-separated list of sorted integers.\n\nOutput format:\n- The integer index or -1.",
    difficulty: "Easy",
    constraints: "Logarithmic search runtime required.",
    visibleTestCases: [
      { input: "9\n-1,0,3,5,9,12", expectedOutput: "4" },
      { input: "2\n-1,0,3,5,9,12", expectedOutput: "-1" }
    ],
    hiddenTestCases: [
      { input: "5\n5", expectedOutput: "0" },
      { input: "10\n1,3,5,7,9", expectedOutput: "-1" },
      { input: "1\n1,2,3,4,5,6,7,8,9,10", expectedOutput: "0" }
    ],
    language: "python"
  },
  {
    title: "Plus One",
    description: "Given a large integer represented as an integer array of digits, increment the large integer by one and return the resulting array of digits.\n\nInput format:\n- A comma-separated list of digits.\n\nOutput format:\n- A comma-separated list of digits representing the incremented value.",
    difficulty: "Easy",
    constraints: "1 <= digits.length <= 100",
    visibleTestCases: [
      { input: "1,2,3", expectedOutput: "1,2,4" },
      { input: "4,3,2,1", expectedOutput: "4,3,2,2" },
      { input: "9", expectedOutput: "1,0" }
    ],
    hiddenTestCases: [
      { input: "9,9,9", expectedOutput: "1,0,0,0" },
      { input: "0", expectedOutput: "1" }
    ],
    language: "python"
  },
  {
    title: "Search Insert Position",
    description: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.\n\nInput format:\n- The first line contains the target.\n- The second line contains a comma-separated list of sorted integers.\n\nOutput format:\n- The insert index.",
    difficulty: "Easy",
    constraints: "Must run in O(log n) time.",
    visibleTestCases: [
      { input: "5\n1,3,5,6", expectedOutput: "2" },
      { input: "2\n1,3,5,6", expectedOutput: "1" },
      { input: "7\n1,3,5,6", expectedOutput: "4" }
    ],
    hiddenTestCases: [
      { input: "0\n1,3,5,6", expectedOutput: "0" },
      { input: "2\n2", expectedOutput: "0" }
    ],
    language: "python"
  },
  {
    title: "Climbing Stairs",
    description: "You are climbing a staircase. It takes N steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\nInput format:\n- An integer N.\n\nOutput format:\n- The number of distinct ways.",
    difficulty: "Medium",
    constraints: "1 <= N <= 45",
    visibleTestCases: [
      { input: "2", expectedOutput: "2" },
      { input: "3", expectedOutput: "3" }
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "1" },
      { input: "5", expectedOutput: "8" },
      { input: "10", expectedOutput: "89" },
      { input: "35", expectedOutput: "14930352" }
    ],
    language: "python"
  },
  {
    title: "Maximum Subarray",
    description: "Given an integer array, find the subarray with the largest sum, and print that sum (Kadane's algorithm).\n\nInput format:\n- A comma-separated list of integers.\n\nOutput format:\n- The maximum sum value.",
    difficulty: "Medium",
    constraints: "-10^4 <= nums[i] <= 10^4",
    visibleTestCases: [
      { input: "-2,1,-3,4,-1,2,1,-5,4", expectedOutput: "6" },
      { input: "1", expectedOutput: "1" }
    ],
    hiddenTestCases: [
      { input: "5,4,-1,7,8", expectedOutput: "23" },
      { input: "-1,-2,-3", expectedOutput: "-1" }
    ],
    language: "python"
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/paircode');
    console.log('✅ Connected to MongoDB to seed problems.');
    
    // Clear existing problems
    await Problem.deleteMany({});
    console.log('🗑️ Cleared existing problems.');
    
    // Insert new problems
    const inserted = await Problem.insertMany(problems);
    console.log(`🎉 Seeded ${inserted.length} problems successfully!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding problems:', error);
    process.exit(1);
  }
}

seed();
