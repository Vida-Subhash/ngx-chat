export function id(): string {
    let i;
    while (!i) {
        i = Math.random()
            .toString(36)
            .substr(2, 12);
    }
    return i;
}


export function  unixTimestap():string {
    let time;
    time =   Math.floor(Date.now() / 1000);
    return time;
   }
