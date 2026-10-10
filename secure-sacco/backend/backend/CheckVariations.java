import java.util.ArrayList;
import java.util.List;

public class CheckVariations {
    public static void main(String[] args) {
        String raw = "+254721338747";
        System.out.println("Raw Input: " + raw);
        System.out.println("Candidates Checked: " + buildPhoneCandidates(raw));
    }
    
    private static List<String> buildPhoneCandidates(String raw) {
        List<String> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) return out;

        boolean hadPlus = raw.trim().startsWith("+");
        String digits   = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return out;

        String nine = null;
        if      (digits.startsWith("254") && digits.length() == 12) nine = digits.substring(3);
        else if ((digits.startsWith("07") || digits.startsWith("01")) && digits.length() == 10) nine = digits.substring(1);
        else if (digits.length() == 9) nine = digits;

        if (nine == null) {
            out.add(raw.trim());
            if (!raw.trim().equals(digits)) out.add(digits);
            return out;
        }

        out.add("0" + nine);
        out.add("254" + nine);
        out.add("+254" + nine);
        out.add(nine);

        if (hadPlus && !out.contains(raw.trim())) out.add(raw.trim());
        return out;
    }
}
