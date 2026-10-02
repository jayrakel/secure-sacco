import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
public class webauthn_test2 {
    public static void main(String[] args) throws Exception {
        RelyingParty rp = RelyingParty.builder().identity(RelyingPartyIdentity.builder().id("localhost").name("Test").build()).build();
        AssertionRequest request = rp.startAssertion(StartAssertionOptions.builder().username("test").build());
        System.out.println(request.toCredentialsGetJson());
    }
}
