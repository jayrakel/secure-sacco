import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../data/settings_dto.dart';
import '../../../data/settings_providers.dart';

class SchedulesSettingsTab extends ConsumerStatefulWidget {
  final SaccoSettingsResponse settings;
  const SchedulesSettingsTab({super.key, required this.settings});

  @override
  ConsumerState<SchedulesSettingsTab> createState() => _SchedulesSettingsTabState();
}

class _SchedulesSettingsTabState extends ConsumerState<SchedulesSettingsTab> {
  final _savingsFormKey = GlobalKey<FormState>();
  final _meetingsFormKey = GlobalKey<FormState>();

  late String _savingsDay;
  late bool _savingsDeadlineNextDay;
  late TextEditingController _savingsDeadlineHour;
  late TextEditingController _savingsDeadlineMinute;
  late TextEditingController _meetingLeadHours;

  final List<String> _daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  @override
  void initState() {
    super.initState();
    _savingsDay = widget.settings.savingsDay ?? 'THURSDAY';
    _savingsDeadlineNextDay = widget.settings.savingsDeadlineNextDay ?? true;
    _savingsDeadlineHour = TextEditingController(text: widget.settings.savingsDeadlineHour?.toString() ?? '23');
    _savingsDeadlineMinute = TextEditingController(text: widget.settings.savingsDeadlineMinute?.toString() ?? '59');
    _meetingLeadHours = TextEditingController(text: widget.settings.meetingNotificationLeadHours?.toString() ?? '48');
  }

  @override
  void dispose() {
    _savingsDeadlineHour.dispose();
    _savingsDeadlineMinute.dispose();
    _meetingLeadHours.dispose();
    super.dispose();
  }

  void _saveSavingsSchedule() async {
    if (!_savingsFormKey.currentState!.validate()) return;
    
    final request = UpdateSavingsScheduleRequest(
      savingsDay: _savingsDay,
      savingsDeadlineNextDay: _savingsDeadlineNextDay,
      savingsDeadlineHour: int.parse(_savingsDeadlineHour.text),
      savingsDeadlineMinute: int.parse(_savingsDeadlineMinute.text),
    );

    await ref.read(settingsNotifierProvider.notifier).updateSavingsSchedule(request);
    _checkStatus('Savings schedule updated');
  }

  void _saveMeetingsSettings() async {
    if (!_meetingsFormKey.currentState!.validate()) return;
    
    final request = UpdateMeetingsRequest(
      meetingNotificationLeadHours: int.parse(_meetingLeadHours.text),
    );

    await ref.read(settingsNotifierProvider.notifier).updateMeetingsSettings(request);
    _checkStatus('Meeting settings updated');
  }

  void _checkStatus(String successMsg) {
    final state = ref.read(settingsNotifierProvider);
    if (!mounted) return;
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString()), backgroundColor: AppColors.negative));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(successMsg), backgroundColor: AppColors.positive));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(settingsNotifierProvider);
    final isLoading = state.isLoading;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Savings Schedule', style: AppTextStyles.h3),
          const SizedBox(height: 16),
          Form(
            key: _savingsFormKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  value: _savingsDay,
                  decoration: const InputDecoration(labelText: 'Savings Day', border: OutlineInputBorder()),
                  items: _daysOfWeek.map((day) => DropdownMenuItem(value: day, child: Text(day))).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _savingsDay = val);
                  },
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Deadline is Next Day?'),
                  value: _savingsDeadlineNextDay,
                  onChanged: (val) => setState(() => _savingsDeadlineNextDay = val),
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _savingsDeadlineHour,
                        decoration: const InputDecoration(labelText: 'Deadline Hour (0-23)', border: OutlineInputBorder()),
                        keyboardType: TextInputType.number,
                        validator: (val) {
                          final v = int.tryParse(val ?? '');
                          if (v == null || v < 0 || v > 23) return 'Invalid hour';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _savingsDeadlineMinute,
                        decoration: const InputDecoration(labelText: 'Deadline Minute (0-59)', border: OutlineInputBorder()),
                        keyboardType: TextInputType.number,
                        validator: (val) {
                          final v = int.tryParse(val ?? '');
                          if (v == null || v < 0 || v > 59) return 'Invalid minute';
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _saveSavingsSchedule,
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    child: isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Save Savings Schedule', style: TextStyle(color: Colors.white, fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 48),
          const Text('Meetings Settings', style: AppTextStyles.h3),
          const SizedBox(height: 16),
          Form(
            key: _meetingsFormKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: _meetingLeadHours,
                  decoration: const InputDecoration(labelText: 'Notification Lead Time (hours)', border: OutlineInputBorder()),
                  keyboardType: TextInputType.number,
                  validator: (val) => val == null || int.tryParse(val) == null ? 'Required number' : null,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _saveMeetingsSettings,
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    child: isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Save Meetings Settings', style: TextStyle(color: Colors.white, fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
