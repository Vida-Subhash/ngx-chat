export function  unixTimestap():string {
    let time;
    time =   Math.floor(Date.now() / 1000);
    return time;
   }
