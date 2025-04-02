import React, { useRef, useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [maskStatus, setMaskStatus] = useState("Detecting...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    // Access the webcam
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing webcam:", err));

    // Start capturing frames once video is playing
    const video = videoRef.current;
    if (video) {
      video.onloadeddata = () => {
        setIsVideoReady(true);
        // Initialize canvas size
        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth || 640;
          canvasRef.current.height = video.videoHeight || 480;
        }
      };
    }
  }, []);

  useEffect(() => {
    // Only start the interval once video is ready
    if (!isVideoReady) return;
    
    const interval = setInterval(captureFrame, 500);
    return () => clearInterval(interval);
  }, [isVideoReady]);

  const captureFrame = () => {
    if (isProcessing || !isVideoReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    const context = canvas.getContext("2d");
    
    // Ensure canvas dimensions match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Capture the canvas as a blob to send to the backend
    canvas.toBlob((blob) => {
      if (blob) sendToBackend(blob);
    }, "image/jpeg");
  };

  const sendToBackend = async (imageBlob) => {
    setIsProcessing(true);
    const BACKEND_URL = "https://face-mask-detector-j0f6.onrender.com";
    const formData = new FormData();
    formData.append("image", imageBlob, "frame.jpg");

    try {
      const response = await axios.post(`${BACKEND_URL}/detect`, formData);
      setMaskStatus(response.data.mask_status);
      
      // Get fresh canvas context since we might have updated dimensions
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      // Redraw video frame to avoid artifacts
      const video = videoRef.current;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Then draw bounding boxes
      if (response.data.faces && response.data.faces.length > 0) {
        drawBoundingBoxes(response.data.faces);
      }
    } catch (error) {
      console.error("Error sending frame:", error);
    }

    setIsProcessing(false);
  };

  const drawBoundingBoxes = (faces) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext("2d");

    // Draw bounding boxes on the faces detected
    faces.forEach(({ x, y, w, h }) => {
      context.strokeStyle = "red";
      context.lineWidth = 3;
      context.strokeRect(x, y, w, h);
    });
  };

  return (
    <div style={{ textAlign: "center", padding: "20px", background: "#111", minHeight: "100vh" }}>
      <h1 style={{ color: "#fff" }}>Real-Time Face Mask Detection</h1>
      
      {/* Make video visible during development for troubleshooting */}
      <div style={{ position: "relative", width: "640px", height: "480px", margin: "0 auto" }}>
        {/* The video element plays but is "underneath" the canvas */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
            visibility: "hidden" // Use visibility:hidden instead of display:none
          }}
        />
        
        {/* Canvas overlays the video */}
        <canvas
          ref={canvasRef}
          style={{ 
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            border: "1px solid #333"
          }}
        />
      </div>
      
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#fff",
          backgroundColor: maskStatus=='Mask'? "green" : "red",
          padding: "10px",
          borderRadius: "5px",
          margin: "20px auto",
          width: "fit-content",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
        }}
      >
        Status: {maskStatus}
      </h2>
    </div>
  );
};

export default App;