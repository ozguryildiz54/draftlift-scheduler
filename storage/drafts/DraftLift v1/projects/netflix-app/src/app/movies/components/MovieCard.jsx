"use client"
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import React from 'react'

const MovieCard = ({vote_average,poster_path,id}) => {

  const router=useRouter()
  return (
    <div
    onClick={()=>router.push("/movies/"+id)}
    
     className="w-40 h-[240px] relative cursor-pointer">
      <Image
        width={160}
        height={240}
        src={"https://image.tmdb.org/t/p/w1280" + poster_path}
      />

      <span className="absolute bottom-1 right-1 text-white font-semibold z-10">
        {" "}
        {vote_average}
      </span>
    </div>
  );
}

export default MovieCard