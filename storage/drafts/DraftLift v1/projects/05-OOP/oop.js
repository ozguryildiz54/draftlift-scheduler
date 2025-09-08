/* -------------------------------------------------------
                   OBJECTS & OOP & CLASSES
------------------------------------------------------- *

//? OBJECTS
//* Declaration:
// Direkt obje isimlendirirken PascalCase veya camelCase kullanabiliriz.

const exampleObj = {
    propertyName: 'value', // attribute, field

    methodName: function () {
        return 'Functions in the object called "method".'
    },

    methodAltarnative() {
        return 'Functions in the object called "method".'
    }

}
/* ------------------------------------------------------- *

const Car = {
    brand: 'Ford',
    model: 'Mustang',
    year: 1967,
    isAutoGear: true,
    colors: ['white', 'red'],
    details: {
        color1: 'white',
        color2: 'red',
        engineSize: 4900
    },
    startEngine: function (param1) {
        console.log(param1)
        return 'Engine started'
    }
};

console.log(Car.brand);
console.log(Car.model);
console.log(Car.colors[0]);
console.log(Car.details);
console.log(Car.details.engineSize);
console.log(Car.details['color2']);
console.log(Car.startEngine('value'));

/* ------------------------------------------------------- *

//? 'THIS' KEYWORD Refers to the execution context (object)


const Car = {
    brand: 'Ford',
    model: 'Mustang',
    year: 1967,
    isAutoGear: true,
    colors: ['white', 'red'],
    details: {
        color1: 'white',
        color2: 'red',
        engineSize: 4900
    },

    startEngine: function (param1) {
        console.log(param1)
        return 'Engine started'
    },

    getDetails() {
        // return this // refers the object itself
        // return this.brand + ' ' + this.model + ' ' + this.year
        return this.details
    },

    getDetailWithArrowFn: () => { // in arraw function this keyword does not work casuse it scope is differnt

        const x = 'hi'

        return this
    }
};

// console.log(Car.getDetails());
// console.log(Car.getDetailWithArrowFn());


/* ------------------------------------------------------- *
//? "NEW" KEYWORD Creates a new instance of an object

const carConstructor = function (brand, model, year) {

    this.brand = brand
    this.model = model
    this.year = year

    this.startEngine = function () {
        return "Engine started"
    }

};


const newCar = new carConstructor('Ford', 'Mustang', 1967)
const newCar1 = new carConstructor('Tofas', 'Dogan', 2025)
// console.log(typeof newCar, newCar);
// console.log(newCar1);
console.log(newCar1.brand);
console.log(newCar1.model);
console.log(newCar1.year);
console.log(newCar1.startEngine());


/* ------------------------------------------------------- *

//? OOP: Object Oriented Programming

//* Class is a blueprint for creating objects. It defines properties  and methods that objects will have.
//* OOP is a way of structuring code using objects.
//* OOP helps organize code by preventing:
//- Code duplication (Inheritance)
//- Messy logic (Encapsulation & Abstraction)
//- Difficult code reuse (Polymorphism)


//* OOP is the concept.
//* Classes are the way to implement OOP.


//* Class Declaration:
class PascalCaseDeclaration { }

//* Class Expression:
const PascalCaseExpression = class {

    undefinedProperty // only defined not assigned any value -> undefined
    propertyName = 'value' // attribute, field

    //? "new Class" ile obje olustururken parametre gondermek icin "constructor" isminde bir method kullaniriz.
    constructor(parametre1, parametre2) {
        this.property1 = parametre1
        this.property2 = parametre2
    }


    methodName1() {
        return this
    }
}

//? INSTANCE = bir class'tan turetilen objedir.
const PascalCaseInstance = new PascalCaseExpression(1, 2)

// console.log(typeof PascalCaseInstance, PascalCaseInstance);
console.log(PascalCaseInstance.undefinedProperty);
console.log(PascalCaseInstance.property1);
console.log(PascalCaseInstance.property2);
console.log(PascalCaseInstance.methodName1());


/* ------------------------------------------------------- *
//? ENCAPSULATION
// Bundling data (variables) and methods (functions) into a single unit (object).
// Protects data from direct access by restricting modification.


// Worst Approach
// const brand = 'Tofas';
// let speed = 100;

// function accelerate() {
//     speed += 50;
//     console.log(`${brand} is going at ${speed} km/h`);
// };

// accelerate();

// Better Approach
class Car {
    #speed; // Private attribute

    constructor(brand, speed) {
        this.brand = brand
        this.#speed = speed
    }

    accelerate() {
        this.#speed += 50
        console.log(`${this.brand} is going at ${this.#speed} km/h`);
    };
}

const tofas = new Car('Tofas', 100);
tofas.accelerate()
console.log(tofas.speed);


/* ------------------------------------------------------- *
//? ABSTRACTION
// Hides complex logic and only exposes necessary details.

class Payment {

    proccessPayment(amount) {
        this.#connectToBank(); // private method
        console.log(`Payment of ${amount} proccessing...`);
    }

    #connectToBank() {
        console.log('Connecting to bank....');
    }

}

const person1 = new Payment();
person1.proccessPayment(200);

/* ------------------------------------------------------- *
//? INHERITANCE
// Allows a child class to inherit properties and methods from a parent class.
// SUPER: Parent Class - THIS: Child Class

// Parent class: Vehicle

class Vecihle {
    constructor(type, brand, model, year) {
        this.type = type
        this.brand = brand
        this.model = model
        this.year = year
    }

    startEngine() {
        this.isRunnig = true
        console.log(`${this.brand} ${this.model}'s engine started!`);
    }

    stopEngine() {
        this.isRunnig = false
        console.log(`${this.brand} ${this.model}'s engine stopped!`);
    }
}

// Child class: Car (inherits from Vehicle)
class Car extends Vecihle {

    constructor(brand, model, year, fuelType) {
        super('Car', brand, model, year)
        this.fuelType = fuelType
    }

    honk() {
        console.log(`${this.brand} ${this.model} honks: Beep Beep!`);
    }
}


const myCar = new Car('Toyota', 'Corolla', 2025, 'Petrol')
// console.log(myCar);
// myCar.startEngine();
// myCar.honk();
// myCar.stopEngine();


// GrandChild class: ElecricCar (inherits from Car)
class ElectiricCar extends Car {
    constructor(brand, model, year, batteryCapacity) {
        super(brand, model, year, 'Electiric')
        this.batteryCapacity = batteryCapacity
    }
    chargeBattery() {
        console.log(`${this.brand} ${this.model} is charging. Battery: ${this.batteryCapacity} kWh`);
    }
}

const myTesla = new ElectiricCar('Tesla', 'Model S', 2024, 100)
// console.log(myTesla);

myTesla.startEngine();
myTesla.chargeBattery();
myTesla.honk();
myTesla.stopEngine();

/* ------------------------------------------------------- *
//? POLYMORPHISIM:
//  A child class to have different behaviors for the same method as the parent class.
// - Method Overriding: Child class redefines a method from the parent class.
// - Method Overloading: JavaScript does not support it natively, but TypeScript does.


// Parent class: Animal
class Animal {
    constructor(name) {
        this.name = name;
    }

    makeSound() {
        console.log("Some generic animal sound...");
    }
}

// Child class: Dog (inherits from Animal)
class Dog extends Animal {
    makeSound() { // Overriding the parent method
        console.log(`${this.name} barks: Woof! Woof!`);
    }
}


// Child class: Cat (inherits from Animal)
class Cat extends Animal {
    makeSound() { // Overriding the parent method
        console.log(`${this.name} meows: Meow! Meow!`);
    }
}


const genereciAnimal = new Animal('Generic Animal')
console.log(genereciAnimal.makeSound());
const myDog = new Dog('Buddy');
console.log(myDog.makeSound());
const myCat = new Cat('Sezar');
console.log(myCat.makeSound());


/* ------------------------------------------------------- */
//? Access Modifiers:
// - PUBLIC: (Parent: Yes, Child: Yes, Instance: Yes)
// - PROTECTED: (Parent: Yes, Child: Yes, Instance: No) (JS does not support.)
// - PRIVATE: (Parent: Yes, Child: No, Instance: No)


class Vehicle {

    vehicleIsActive = false // PUBLIC PROPERTY

    _protectedProperty = 'protected-value' // PROTECTED PROPERTY
    _protectedMethod() { return this } // PROTECTED METHOD

    #privateProperty = 'private-value' // PRIVATE PROPERTY
    #privateMethod() { return this } // PRIVATE METHOD

    constructor(vehicleType) {
        this.vehicleType = vehicleType
        console.log('privateProperty', this.#privateProperty) // Allow access from only self-class.
    }

    getDetails() {
        console.log('Vehicle.getDetails started.')
        return this.vehicleType
    }
}

class Car extends Vehicle { // Inheritance

    isRunning = false

    constructor(brand, model, year, vehicleType = 'Car') {
        super(vehicleType)
        this.brand = brand
        this.model = model
        this.year = year
        // console.log('privateProperty', this.#privateProperty) // NO ACCESS
        console.log('protectedProperty', this._protectedProperty)
    }

    runEngine() {
        this.isRunning = true
        console.log('Engine started')
        return this.isRunning
    }

    getDetails() {
        console.log('Car.getDetails started.')
        // return this
        return super.getDetails() // Ezdiğimiz methodu çalıştırma yöntemi.
    }
}


const Ford = new Car('Ford', 'Mustang', 1967);
console.log(Ford);
console.log(Ford._protectedProperty);

/* ------------------------------------------------------- */

// Happy Coding CH19...