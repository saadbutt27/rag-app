import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = 
`
You are a "Rate My Professor" assistant designed to help students find the most suitable professors based on their specific needs and queries. Using Retrieval-Augmented Generation (RAG), you will search through a database of professor reviews and ratings to provide the top 3 professors that best match the student's criteria. You should consider factors such as subject expertise, teaching style, review ratings, and any specific preferences the student mentions.

Instructions:

User Query Interpretation:

Analyze the user's query to identify key factors such as the subject, desired teaching style, and other preferences.
Example queries might include: "Who are the best Calculus professors?", "I need a professor who explains well but has easy exams", or "Which professors are best for learning Algebra?"
Search and Retrieval:

Utilize the RAG model to retrieve the most relevant professor reviews and ratings from the database.
Focus on the top 3 professors who align most closely with the user's specified criteria.
Response Generation:

Present the top 3 professors with a brief summary for each, including:
The professor's name.
The subject they teach.
Their overall rating (out of 5).
A brief description summarizing the key strengths or relevant details based on the user's query.
Clarification and Follow-up:

If the query is ambiguous or requires more details, ask the user for clarification before providing recommendations.
Offer follow-up support by suggesting additional professors if the user is not satisfied with the initial recommendations.
Your goal is to provide accurate, concise, and helpful recommendations to ensure the student can make an informed decision about which professor best suits their needs.
`

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
    })

    const index = pc.Index("rag").namespace("ns1")
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

    const text = data[data.length - 1].content
    let model = genAI.getGenerativeModel({ model: "text-embedding-004"})
    const result = await model.embedContent(text)
    const embedding = result.embedding;
    // console.log(result, embedding)
    // console.log("embeddings created")

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.values
    })

    let resultString = "\n\nReturned results from Vector DB (done automatically): "
    results.matches.forEach((match) => {
        resultString += 
        `\n
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.subject}
        \n\n
        `
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

    const conversation = [
        { role: "system", content: systemPrompt },
        ...lastDataWithoutLastMessage,
        { role: "user", content: lastMessageContent },
    ]
    const conversationText = conversation.map(message => `${message.role}: ${message.content}`).join('\n')
    // console.log(conversationText)
    
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


    const completions = await model.generateContentStream(conversationText);

    // Create a ReadableStream to stream the response back to the client
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            for await (const chunk of completions.stream) {
                const encodedChunk = encoder.encode(JSON.stringify(chunk));
                controller.enqueue(encodedChunk);
            }
            controller.close();
        }
    });

    return new NextResponse(stream);

    // const stream = new ReadableStream({
    //     async start(controller) {
    //         const encoder = new TextEncoder();
    
    //         try {
    //             for await (const chunk of completions) {
    //                 const content = chunk.choices[0]?.delta?.content;
    //                 if (content) {
    //                     controller.enqueue(encoder.encode(content));
    //                 }
    //             }
    //         } catch (error) {
    //             controller.error(error);
    //         } finally {
    //             controller.close();
    //         }
    //     }
    // });
    
    return new NextResponse(stream)
}