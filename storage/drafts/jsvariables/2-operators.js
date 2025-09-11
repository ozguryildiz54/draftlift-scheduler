// * =======================================================
// *                 ARİTMETİK OPERATÖRLER
// * =======================================================

const kola = 50;
const cips = 60;
const cikolata = 35;
let toplam = kola + cips + cikolata;

console.log(toplam); //145

//!bir arttır

toplam = toplam + 1;
console.log(toplam); //146

toplam++;

console.log(toplam);

//!10 arttır
toplam += 10; //toplam=toplam+10

console.log(toplam);

//! + operatörü string lerde birleştirme (concatination) işlemi yapar

const ad= "Joseph"
const soyad="bilir"

console.log("adim ve soyadim " + ad +" " + soyad);

console.log(`adim ve soyadim  ${ad}     ${soyad}`);


//!ARTTIRMA AZALTMA

let a=5

console.log("ilk", a++);

console.log("ikinci", a);//6

let b=a++

console.log("b:" , b);//6
console.log("a:" , a);//7


let c=10

console.log(++c);//11
console.log(c);

let e=45

console.log(e--);//45
console.log(e);//44
console.log(--e);//43


//! eyi 5 arttır

e+=5
console.log(e);


//!e nin 5 katını gör

e*=5
console.log(e);


//!ÇARPMA VE ÜS ALMA

const pi =3.14

const yaricap=5

const alan=pi*yaricap**2

console.log(alan);


















