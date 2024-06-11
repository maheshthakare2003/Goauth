import React, { useState } from "react";
import axios from "axios";

const Home = () => {
  const [videoInfo, setVideoInfo] = useState({
    title: "",
    description: "",
    cloudinaryUrl: "", // New field for the Cloudinary URL
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setVideoInfo(prevState => ({
      ...prevState,
      [name]: value
    }));
  }

  function handleUpload() {
    axios.post("http://localhost:3000/upload", videoInfo)
      .then(response => {
        window.location.href = response.data.authUrl; // Redirect to the authorization URL
      })
      .catch(error => {
        console.error("Error uploading video:", error);
      });
  }

  return (
    <div>
      <h1>Upload YouTube Videos</h1>
      <form>
        <div>
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={videoInfo.title}
            onChange={handleChange}
          />
        </div>
        <div>
          <textarea
            name="description"
            placeholder="Description"
            value={videoInfo.description}
            onChange={handleChange}
          />
        </div>
        <div>
          <input
            type="text"
            name="cloudinaryUrl"
            placeholder="Cloudinary URL"
            value={videoInfo.cloudinaryUrl}
            onChange={handleChange}
          />
        </div>
        <button type="button" onClick={handleUpload}>Upload Video</button>
      </form>
    </div>
  );
};

export default Home;
