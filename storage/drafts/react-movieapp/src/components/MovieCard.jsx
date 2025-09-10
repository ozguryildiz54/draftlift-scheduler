import React from 'react'
import { useNavigate } from 'react-router-dom';

const MovieCard = ({id,title,overview,poster_path, vote_average}) => {
 
 const navigate=useNavigate()
  
  return (
    <div
    
    onClick={()=>navigate("/details/"+id)}
     className='movie' id="container">
      {/* img için base adrese endpoint olaraka dizideki poster_path eklenecek */}
      <img
        loading="lazy"
        src={`https://image.tmdb.org/t/p/w1280${poster_path}`}
        alt=""
      />

      <div className="flex align-baseline justify-between p-1 text-white">
        <h5>{title} </h5>
        <span
          className={`tag ${
            vote_average > 7 ? "green" : vote_average > 6.8 ? "orange" : "red"
          }`}
        >
          {vote_average.toFixed(2)}
        </span>
      </div>

      <div className="movie-over">
        <h2>Overview</h2>
        <p>{overview} </p>
      </div>
    </div>
  );
}

export default MovieCard