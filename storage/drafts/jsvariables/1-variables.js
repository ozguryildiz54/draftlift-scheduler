//!  %%%%%%%%%%% DEĞİŞKEN TANIMLAMA  %%%%%%%%%%%%%%%%

//  CONST ve LET, ECMASCRIPT6 ile gelmiştir. VAR eski versiyonlardan beri bulunmaktadır.

// ===================  CONST  ======================
// ? const ve let Modern JS ile gelmiş yeni değişken tanımlama keyword'leridir.
// ! CONST: Sadece başlangıçta değer atanabilir.
// ! Sonradan değeri değiştirilemez (non-primitive'ler (array..) hariç).

const yas = 25;

console.log(yas);
console.log(typeof yas);

// yas=45 const keyword ü kullanınca değişkeni değiştiremeyiz

// const isim; const keyword üne başlangıç değeri atamak zorundayız

const isTrue=true

console.log(isTrue);
console.log(typeof isTrue);
const isim="ipek"
console.log(typeof isim);

// ======================  LET  ========================
//? LET de CONST gibi yaygın kullanılan değişken tanımlama yöntemidir.
//! CONST'dan farkı, sadece tanımlama kısmında değil istenildiği zaman değeri değiştirilebilir.
//* CONST gibi tanımlandığı blok içerisinde geçerlidir. Başka yerlerden erişilemez. (Block-Scoped)
//? CONST kullanamadığımız durumlarda (değişkenin değeri sürekli değişecekse) LET kullanmalıyız.

let dil="javascript"

dil="java"

console.log(dil);

dil=true

console.log(typeof dil);


let sayi="5"

console.log(sayi + 7);
console.log(sayi - 7);
//! bir string ile number ı toplamaya kalkarsak sayıları yanyana yazar

// ===================  VAR VERİ TİPİ ===============================
//? VAR ile bir değişken tanımlandığında LET de olduğu gibi değeri sonradan değiştirilebilir.
//! VAR değişkenleri tanımlandığı yere göre global olarak veya fonksiyon içerisinde erişilebilir.
//* - Değişken fonksiyon içerisinde tanımlandı ise ancak o fonksiyonda erişilebilir (Function-scoped).
//? - Eğer, değişken fonksiyonların dışında tanımlandı ise tüm her yerden erişilebilir. (Global-scoped).
//! Günümüzde programcılar global değişken gerekmedikçe VAR ile değişken tanımlamayı seçmemektedir.

var sayi2=45

sayi2=56
console.log(sayi2);

console.log("******************************");

var ilk="GLOBAL"

console.log(ilk);
{
console.log(ilk);
ilk="ORTAMALI"

console.log(ilk);

var ikinci="güvensiz"

}

console.log(ilk);
console.log(ikinci);

//! var keyword ü kullanılınca blok içerisinde ve dışarısında erişebiliriz. blok içinde tanımlanan değişkene dışardan da erişebiliriz

console.log("******************************");


let first="osman"

console.log(first);

{
console.log(first);
first="hüseyin"
console.log(first);

let second="Raife"
console.log(second);


}

console.log(first);
// console.log(second);//second is not defined

//!LET TEKİ AYNI İŞLEMLERİ CONST İÇİNDE YAPALIM

const bir="Cemal"
console.log(bir);

{
console.log(bir);

const iki="Hasan"
console.log(iki);

}

// console.log(iki);

//! const ve let için scope (süslü) içinde scope içinde kalır