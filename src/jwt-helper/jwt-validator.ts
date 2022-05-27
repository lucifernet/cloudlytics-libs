import * as jwt from "jsonwebtoken";
import * as fs from "fs"

interface JwtValidator {
    verify(token: string): jwt.JwtPayload;
}

class CertJwtValidator implements JwtValidator {
    protected publicCert: Buffer;

    constructor(publicKeyPath: string) {
        if (!fs.existsSync(publicKeyPath))
            throw new Error("Public key file does not exist.");

        this.publicCert = fs.readFileSync(publicKeyPath);
    }

    public verify(token: string): jwt.JwtPayload {
        return jwt.verify(token, this.publicCert) as jwt.JwtPayload;
    }
}

export { CertJwtValidator, JwtValidator }