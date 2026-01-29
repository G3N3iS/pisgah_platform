
import sqlite3 from "sqlite3";
import { promisify } from "util";

const DB_PATH = process.env.DB_PATH || "./pisgah.sqlite";

sqlite3.verbose();
export const db = new sqlite3.Database(DB_PATH);

export const run = (sql, params=[]) =>
  new Promise((resolve, reject)=> db.run(sql, params, function(err){
    if(err) return reject(err);
    resolve({ lastID: this.lastID, changes: this.changes });
  }));

export const get = (sql, params=[]) =>
  new Promise((resolve, reject)=> db.get(sql, params, (err,row)=>{
    if(err) return reject(err);
    resolve(row);
  }));

export const all = (sql, params=[]) =>
  new Promise((resolve, reject)=> db.all(sql, params, (err,rows)=>{
    if(err) return reject(err);
    resolve(rows);
  }));

export async function init(){
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    isPro INTEGER NOT NULL DEFAULT 0,
    proExpiresAt TEXT DEFAULT NULL,
    createdAt TEXT NOT NULL
  )`);
}
