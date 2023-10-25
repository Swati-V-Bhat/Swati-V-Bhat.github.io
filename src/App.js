import './App.css';
import React from 'react';
import logo from './logo.svg';
import MicRecorder from "mic-recorder-to-mp3"
import { useEffect, useState, useRef } from "react"
import axios from "axios"
//import { BartTokenizer, BartForConditionalGeneration } from 'transformers';
//import JsonView from 'react18-json-view'
//import 'react18-json-view/src/style.css'
//import Summarizer from "./Summarizer";


//<JsonView src={my_json_object} />

//import dotenv from "dotenv";

//dotenv.config();

const YourAPIKey = process.env.REACT_APP_API_KEY;
const apiKey = process.env.REACT_APP_HUGGING_FACE_API_KEY;

//Set AssemblyAI Axios Header
const assembly = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: {
    authorization: YourAPIKey,
    "content-type": "application/json",
    //"transfer-encoding": "chunked",
  },
})


function App() {
  const recorder = useRef(null) //Recorder
  const audioPlayer = useRef(null) //Ref for the HTML Audio Tag
  const [blobURL, setBlobUrl] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [isRecording, setIsRecording] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    //Declares the recorder object and stores it inside of ref
    recorder.current = new MicRecorder({ bitRate: 128 })
  }, [])

  const startRecording = () => {
    // Check if recording isn't blocked by browser
    recorder.current.start().then(() => {
      setIsRecording(true)
    })
  }

  const stopRecording = () => {
    recorder.current
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const file = new File(buffer, "audio.mp3", {
          type: blob.type,
          lastModified: Date.now(),
        })
        const newBlobUrl = URL.createObjectURL(blob)
        setBlobUrl(newBlobUrl)
        setIsRecording(false)
        setAudioFile(file)
      })
      .catch((e) => console.log(e))
  }
 //State Variables
  const [uploadURL, setUploadURL] = useState("")
  const [transcriptID, setTranscriptID] = useState("")
  const [transcriptData, setTranscriptData] = useState("")
  const [transcript, setTranscript] = useState("")
  const [selectedFile, setSelectedFile] = useState(null);
  const [summary, setSummary] = useState('');


  useEffect(() => {
    if (audioFile) {
      assembly
        .post("/upload", audioFile)
        .then((res) => setUploadURL(res.data.upload_url))
        .catch((err) => console.error(err))
    }
  }, [audioFile])

    // Submit the Upload URL to AssemblyAI and retrieve the Transcript ID
    const submitTranscriptionHandler = () => {
      if (selectedFile) {
        // Upload the selected file instead of the audioFile state
        assembly
          .post("/upload", selectedFile)
          .then((res) => {
            setUploadURL(res.data.upload_url);
            setTranscriptID(res.data.id);
            checkStatusHandler();
          })
          .catch((err) => console.error(err));
      } else {

      assembly
        .post("/transcript", {
          audio_url: uploadURL,
        })
        .then((res) => {
          setTranscriptID(res.data.id)
          checkStatusHandler()
        })
        .catch((err) => console.error(err))
    }
  }
    // Check the status of the Transcript and retrieve the Transcript Data
  const checkStatusHandler = async () => {
    setIsLoading(true)
    try {
      await assembly.get(`/transcript/${transcriptID}`).then((res) => {
        setTranscriptData(res.data)
		
      })
    } catch (err) {
      console.error(err)
    }
  }
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAudioFile(file);
    }
  };
  
    // Periodically check the status of the Transcript
    useEffect(() => {
      const interval = setInterval(() => {
        if (transcriptData.status !== "completed" && isLoading) {
          checkStatusHandler()
        } else {
          setIsLoading(false)
          setTranscript(transcriptData.text)
  
          clearInterval(interval)
        }
      }, 1000)
      return () => clearInterval(interval)
    },)
    
    /* const summarizeText = async (text) => {
      const tokenizer = new BartTokenizer();
      const model = new BartForConditionalGeneration.from_pretrained('facebook/bart-large');
    
      const inputs = tokenizer({text}, {return_tensors: 'pt'});
      const outputs = await model.generate(inputs, {max_length: 512, num_beams: 5});
    
      const summary = tokenizer.decode(outputs[0]);
      return summary;
    }; 
    const summarizer = new Summarizer();

  const summarize = async (text) => {
    const summary = await summarizer(transcriptData.text);
   setTranscript(summary);*/

  const summarizeText = async () => {
    try {
      
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        
        
        {
          inputs: transcript.text,
          options: {
            task: "summarization",
          },
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data[0].generated_text;
    } catch (error) {
      console.error("Error summarizing text:", error);
      return "Error summarizing text.";
    }
  };

  return (<div className="App">
    
  <header className="App-header">
  <h1><center>VoicePen</center></h1>
  </header>

  <body>
  
      <div>
       {/*   <button disabled={isRecording} onClick={startRecording}>
          START
        </button> */}
        <div>
        <input class = "btn-space" type="file" accept="audio/*" onChange={handleFileChange} />
        </div>
        
        <audio ref={audioPlayer} src={blobURL} controls='controls' />
        <div>
        <button onClick={startRecording}>
          START
        </button>
        <button disabled={!isRecording} onClick={stopRecording}>
          STOP
        </button>
        <button onClick={submitTranscriptionHandler}>SUBMIT</button>
        </div>
        <div>
      
      {transcriptData.status === "completed" ? (
        <textarea class= "text-area" value={transcript} />
      ) : (
        <p>{transcriptData.status}</p>
      )}
      </div>
      <button onClick={summarizeText}>Summarize</button>
      {summary.status === "completed" ? (
         <textarea class="text-area" value={summary} />
      ) : (
        <p>{summary.status}</p>
      )}
      </div>
</body>
</div>
  
    
  );
  
      }
export default App;