const API_KEY=process.env.TMDB_KEY


export const getirMovies=async(type)=>{
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${type}?api_key=${API_KEY}`
  );

  //? next.js ile fetch api çekilen verileri default olarak cache'ler. bu özelliği option objesi ile değiştirebiliriz
  //   const res = await fetch(URL, { cache: "force-cache" }); default
  // veri değişmediği sürece cache den getir
  //   const res = await fetch(URL, { cache: "no-store" });
  //cache'leme.
  //   const res = await fetch(URL, { next: { revalidate: 10 } });
  // belirli saniye aralıklarla veriyi tekrar çek tekrar

  const { results } = await res.json();

  return results;
}

// tıklanılan movie nin detayına id ile ulaşma

export const getirMovieDetail=async(movieId)=>{

  const res=   await fetch(
       `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`
     );

   const data =  await res.json()

return data


}



// youtube dan tıklanan filmin videosu için iframe e videoKey getirme

export const getirYoutubeKey=async(movieId)=>{
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}`
  );
  const {results}= await res.json();

  return results[0].key
}


