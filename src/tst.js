
let _addresses = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x653d2d1d10c79017b2ea5f5a6f02d9ab6e725395',
    '0x653d2d1d10c79017b2ea5f5a6f02d9ab6e725395',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x653d2d1d10c79017b2ea5f5a6f02d9ab6e725395',
    '0x653d2d1d10c79017b2ea5f5a6f02d9ab6e725395',
    '0x653d2d1d10c79017b2ea5f5a6f02d9ab6e725395',
    '0x653d2d1d10c79017b2ea5f5a6f02d9ab6e725395',
];

let _tokens = [
    1,5,3,5,1,1,2,2,2,2
];

const counts = {};

for (var i = 0; i < _addresses.length; i++) {
  let x = _addresses[i] + "_" + _tokens[i];
  counts[x] = (counts[x] || 0) + 1;
}

let new_addr = [];
let new_token = [];
let new_amount = [];

for (const [key, value] of Object.entries(counts)) {
  new_addr.push(key.split('_')[0]);
  new_token.push(key.split('_')[1]);
  new_amount.push(value);
}
console.log(new_addr);
console.log(new_token);
console.log(new_amount);