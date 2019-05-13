#!/usr/bin/env node
// tslint:disable no-console

import { main } from "./core";

main(process.argv).catch(e => console.error(e));
