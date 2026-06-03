class Vehicle { // frozen
  constructor(make, year) { // frozen
    this.make = make;
    this.year = year;
  } // frozen

  age() { // frozen
    return new Date().getFullYear() - this.year;
  } // frozen

  describe() { // frozen
    return `${this.make} (${this.year}), ${this.age()} years old`;
  } // frozen
} // frozen

const v = new Vehicle("Toyota", 2018);
console.log(v.describe());