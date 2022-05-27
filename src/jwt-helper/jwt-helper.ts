import * as jwt from "jsonwebtoken";
import * as fs from "fs"
import {CertJwtValidator, JwtValidator} from "./jwt-validator"

// interface JwtValidator {
//     verify(token: string): jwt.JwtPayload;
// }

interface JwtSigner extends JwtValidator {
    sign(context: object): string;
}

// class CertJwtValidator implements JwtValidator {
//     protected publicCert: Buffer;

//     constructor(publicKeyPath: string) {
//         if(!fs.existsSync(publicKeyPath))
//             throw new Error("Public key file does not exist.");
            
//         this.publicCert = fs.readFileSync(publicKeyPath);
//     }

//     public verify(token: string): jwt.JwtPayload {
//         return jwt.verify(token, this.publicCert) as jwt.JwtPayload;
//     }
// }

class CertJwtSigner extends CertJwtValidator implements JwtSigner {
    protected privateCert: Buffer;

    constructor(publicKeyPath: string, privateKeyPath: string) {
        super(publicKeyPath);

        if(!fs.existsSync(privateKeyPath))
            throw new Error("Private key file does not exist.");

        this.privateCert = fs.readFileSync(privateKeyPath);
    }

    public sign(context: object): string {
        return jwt.sign(context, this.privateCert);
    }
}

export { 
    CertJwtSigner, 
    CertJwtValidator 
}



