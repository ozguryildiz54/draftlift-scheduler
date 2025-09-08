import { getirYoutubeKey } from '@/helpers/movieFunction';
import React from 'react'

const HeroSection =async ({movies}) => {
    console.log(movies);
    
const videoKey=await getirYoutubeKey(movies.id)



  return (
    <div className="relative h-[50vw]">
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

      <div className="absolute top-[30%] ml-4 md:ml-16">
        <p className="text-white text-1xl md:text-5xl h-full w-[50%] lg:text-6xl font-bold drop-shadow-xl">
          {movies.title}
        </p>
        <p className="text-white text-[8px] md:text-lg mt-3 md:mt-8 w-[90%] md:w-[80%] lg:w-[50%] drop-shadow-xl">
          {movies.overview}
        </p>
      </div>
    </div>
  );
}

export default HeroSection