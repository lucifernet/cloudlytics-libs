import { CertJwtSigner } from '../index';
test('Create CertJwtSigner', () => {
    const publicKey = "/Users/el/Public/certs/SportAdminPublic.pem";
    const privateKey = "/Users/el/Public/certs/SportAdminPrivate.pem";
    const signer = new CertJwtSigner(publicKey, privateKey);
    const signed = signer.sign({ sub: "el" });
    console.log(signed);
    expect(signed.length).toBeGreaterThan(0);
});