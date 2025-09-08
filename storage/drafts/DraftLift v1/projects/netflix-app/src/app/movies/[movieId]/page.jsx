import { getirMovieDetail, getirYoutubeKey } from '@/helpers/movieFunction'
import Link from 'next/link'
import React from 'react'

const MovieDetail = async({params}) => {

   const {movieId}=  params

   const detail=    await getirMovieDetail(movieId)
  
const videoKey=await getirYoutubeKey(movieId)

console.log(videoKey);


   
  return (
    <div className="md:container px-10 mx-auto py-7">
      <h1 className="text-center text-white text-3xl">{detail.title} </h1>
      <p className="text-center text-white text-xl">{detail.tagline} </p>

<div className="w-10/12 lg:w-full mx-auto">
        <div
          className="embed-responsive embed-responsive-16by9 relative w-full overflow-hidden"
          style={{ paddingTop: "50%" }}
        >
          <iframe
            className="embed-responsive-item absolute top-0 right-0 bottom-0 left-0 h-full w-full"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
            allowFullScreen
          ></iframe>
        </div>
      </div>





      <div className="flex items-center mt-3 md:mt-4 gap-3">
        <Link
          className="bg-white text-black rounded-md py-1 md:py-2 px-2 md:px-4 w-auto text-xs lg:text-lg font-semibold flex flex-row items-center hover:bg-neutral-300 transition mt-2"
          href="/movies"
        >
          GO BACK
        </Link>
      </div>
    </div>
  );
}

export default MovieDetail