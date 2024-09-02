"use client"
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I am the Rate my Professor support assistant. How can I help you today?"
    }
  ])
  const [message, setMessage] = useState("")

  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages, 
      { role: "user", content: message },
      { role: "assistant", content: "" }
    ]);
  
    setMessage(""); 
  
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }])
    });
  
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = "";
  
    function processText({ done, value }) {
      if (done) {
        return result;
      }
  
      const textChunk = decoder.decode(value, { stream: true });
      console.log(textChunk)
  
      try {
        const parsedChunk = JSON.parse(textChunk); // Parse the JSON string
        // console.log(parsedChunk)
        // console.log(parsedChunk.candidates[0])
        // console.log(parsedChunk.candidates[0].content)
        // console.log(parsedChunk.candidates[0].content.parts[0])
        // console.log(parsedChunk.candidates[0].content.parts[0].text)
        const text = parsedChunk.candidates[0].content.parts[0].text || ""; // Access the content field
        console.log(text)
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        result += text;
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
  
      return reader.read().then(processText);
    }
  
    reader.read().then(processText);
};

  return (
    <main className="p-24">
      <h1 className="text-5xl font-bold text-center m-5">
        Rate My Prodessor - RAG App
      </h1>

      <div className="w-full flex flex-col justify-center items-center">
        <div className="flex flex-col w-[500px] h-[700px] border-2 border-black p-2 space-x-3">
          <div className="flex flex-col m-3 flex-grow overflow-auto max-h-full">
            {
              messages.map((message, index) => {
                return (
                  <div key={index} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                    <div className={`${message.role === "assistant" ? "bg-red-400" : "bg-orange-300"} text-white rounded-md p-3 mb-2`}>
                      {message.content}
                    </div>
                  </div>
                )
              })
            }
            <div className="flex space-x-5">
              <input 
                type="text" 
                placeholder="Message" 
                className="w-full border-2 border-black rounded-md px-2" 
                value={message} 
                onChange={(e)=>{setMessage(e.target.value)}}
              />
              <button 
                className="bg-black text-white py-2 px-3 rounded-md"
                onClick={sendMessage}  
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
