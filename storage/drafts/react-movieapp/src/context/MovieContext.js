import React, { createContext, useEffect, useState } from "react";
import axios from "axios";

export const MovieContextt = createContext();

const MovieContext = ({ children }) => {
  const [filmler, setFilms] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_KEY = process.env.REACT_APP_TMDB_KEY;

  const URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}`;

  useEffect(() => {
    setLoading(true);
    axios
      .get(URL)
      .then((res) => setFilms(res.data.results))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MovieContextt.Provider value={{ filmler,loading }}>
      {children}
    </MovieContextt.Provider>
  );
};

export default MovieContext;
