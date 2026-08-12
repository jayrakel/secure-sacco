import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

public class scratch {
    public static void main(String[] args) {
        LocalDate start = LocalDate.of(2026, 8, 13); // Thursday
        LocalDate aligned = start.with(TemporalAdjusters.previousOrSame(DayOfWeek.SATURDAY));
        System.out.println("Start: " + start + ", Aligned: " + aligned);
        LocalDate start2 = LocalDate.of(2026, 8, 12); // Wednesday
        LocalDate aligned2 = start2.with(TemporalAdjusters.previousOrSame(DayOfWeek.SATURDAY));
        System.out.println("Start: " + start2 + ", Aligned: " + aligned2);
    }
}
