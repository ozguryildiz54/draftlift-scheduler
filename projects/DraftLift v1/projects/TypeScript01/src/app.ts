"use scrict"
console.log("Merhaba TS")


// Type annotation 
// JS Gösterimi
let x=5 // Auto detection : Otomatik olarak türünü alıyor
x="merhaba" // x sayı olarak algılandığından string değer verildiğinden hata veriyor.
console.log(x)

// TS gösterimi

let y:number=56
y="Hello"
console.log(y)

let ad:string="Helen"
let check:boolean=true

/* -------------------------------------------------------------------------- */

//! ANY DATA TYPE
// Typescipt en esnek veri türü
// TypeScript'in sıkı tür denetimini devre dışı bırakır
//  Önceden türü bilinmeyen veriler için kullanılabilir

let z:any=89 
z="nasılsın"

//! Array DTA TYPE
//JS
let names=["Ali","Ahmet","Ömer",12]
console.log(names)

//TS
let list1:number[]=[56,34,64]
console.log(list1)
list1.push("Ömer")
console.log(list1)

let list2:Array<number>=[5,6,8,9]

//! TUPPLE 

let tuple1:[string,number,boolean]

tuple1=["Ömer",34,true]

// Tuplelar Arrayı

let tuple2:[string,number][]
tuple2=[ ["Ali",98],["Ahmet",100]]

tuple2.push(["Sema",100])
console.log(tuple2)

let car:[string,number]=["BMW",2023]

// Tuple içinde destructure

let [brand,model]=car

console.log(brand)
console.log(model)

//tuple içindeki değerleri engellemek için readonly metdou kullanılır

let config: readonly [string,number]=["Dark Mode",1]

config[0]="light Mode"

console.log(config)

// Bu şekilde yeni bir tuple oluşuturulduğu için hata vermiyor
config=["light mode",3]

// Tamamen değiştirilemez özelliği olması için  onst + readonly

//! ENUM 
// enum, TypeScript’te anlamlı ve sabit değerleri bir arada tutmak için kullanılan bir veri yapısıdır.

//  Kodun okunabilirliğini artırır
//  Sabit değerleri merkezi bir şekilde yönetir
// String veya sayısal değerler ile çalışabilir,
enum Color{
    red,
    green,
    blue
}

let selectedColor:Color=Color.green
console.log(selectedColor)

enum Role{
    User = 1,
    admin,
    guest
}

console.log(Role.guest)

enum statusCode{
    Notfound=404,
    Success=200,
    Acepted=202,
    BadRequest=400
}

console.log(statusCode.Acepted)

enum days{
    Monday="Pazartesi",
    Tuesday="Salı",
    Wednesday="Çarşamba"
}

console.log(days.Monday)

//! Unknown Data Type
// TypeScript’te unknown, any'nin daha güvenli bir versiyonu olarak düşünülebilir. Türü bilinmeyen bir değeri saklamak için kullanılır, ancak any'den farklı olarak doğrudan işlemlere izin vermez.

//  Dışarıdan gelen veriler (API yanıtları, kullanıcı girdileri, JSON verileri) için unknown daha güvenlidir.
//  any kullanmak yerine unknown kullanarak hata yakalama mekanizması oluşturabilirsin.
//  Ancak, doğrudan işlemler yapamayacağın için tür kontrolü yapmayı unutmamalısın.,

let veri1:unknown;
veri1="Merhaba"
veri1=5667
veri1=true 
// BU üç kullanımda geçerli olur 

console.log(veri1)

if (typeof veri1=="string"){
    console.log(veri1.toUpperCase())
}



