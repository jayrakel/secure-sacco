import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/meetings_dto.dart';
import '../../data/meetings_providers.dart';

class CreateEditMeetingDialog extends ConsumerStatefulWidget {
  final Meeting? meeting; // If null, create. If provided, edit.

  const CreateEditMeetingDialog({super.key, this.meeting});

  @override
  ConsumerState<CreateEditMeetingDialog> createState() => _CreateEditMeetingDialogState();
}

class _CreateEditMeetingDialogState extends ConsumerState<CreateEditMeetingDialog> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _lateAfterController;
  
  String _meetingType = 'GENERAL';
  DateTime? _startAt;
  DateTime? _endAt;
  bool _isSubmitting = false;

  final List<String> _meetingTypes = ['AGM', 'GENERAL', 'SPECIAL', 'COMMITTEE'];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.meeting?.title ?? '');
    _descriptionController = TextEditingController(text: widget.meeting?.description ?? '');
    _lateAfterController = TextEditingController(text: widget.meeting?.lateAfterMinutes.toString() ?? '15');
    
    if (widget.meeting != null) {
      _meetingType = widget.meeting!.meetingType;
      _startAt = DateTime.tryParse(widget.meeting!.startAt)?.toLocal();
      if (widget.meeting!.endAt != null) {
        _endAt = DateTime.tryParse(widget.meeting!.endAt!)?.toLocal();
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _lateAfterController.dispose();
    super.dispose();
  }

  Future<void> _selectDateTime(BuildContext context, bool isStart) async {
    final initialDate = isStart ? _startAt ?? DateTime.now() : _endAt ?? (_startAt ?? DateTime.now()).add(const Duration(hours: 1));
    
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
    );
    
    if (pickedDate != null) {
      if (!context.mounted) return;
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(initialDate),
      );
      
      if (pickedTime != null) {
        setState(() {
          final dt = DateTime(pickedDate.year, pickedDate.month, pickedDate.day, pickedTime.hour, pickedTime.minute);
          if (isStart) {
            _startAt = dt;
            if (_endAt != null && _endAt!.isBefore(_startAt!)) {
              _endAt = _startAt!.add(const Duration(hours: 1));
            }
          } else {
            _endAt = dt;
          }
        });
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a Start Date & Time')));
      return;
    }

    setState(() => _isSubmitting = true);

    final data = {
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'meetingType': _meetingType,
      'startAt': _startAt!.toIso8601String(),
      'endAt': _endAt?.toIso8601String(),
      'lateAfterMinutes': int.tryParse(_lateAfterController.text) ?? 15,
    };

    try {
      final repo = ref.read(meetingsRepositoryProvider);
      if (widget.meeting == null) {
        await repo.create(data);
      } else {
        await repo.update(widget.meeting!.id, data);
      }
      
      ref.invalidate(meetingsListProvider);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.negative));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(
        text,
        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Colors.grey.shade700),
      ),
    );
  }

  Widget _buildDateTimePicker(String label, DateTime? dateTime, bool isStart) {
    final hasValue = dateTime != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label),
        InkWell(
          onTap: () => _selectDateTime(context, isStart),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              border: Border.all(color: hasValue ? AppColors.primary : Colors.grey.shade300, width: hasValue ? 2 : 1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  hasValue ? DateFormat('MMM d, yyyy h:mm a').format(dateTime.toLocal()) : 'Select date and time',
                  style: TextStyle(
                    color: hasValue ? AppColors.textPrimary : Colors.grey.shade600,
                    fontSize: 16,
                  ),
                ),
                Icon(Icons.calendar_today, color: hasValue ? AppColors.primary : Colors.grey.shade400, size: 20),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey.shade300),
    );
    final focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.primary, width: 2),
    );

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      title: Text(
        widget.meeting == null ? 'Create Meeting' : 'Edit Meeting',
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22),
      ),
      content: SizedBox(
        width: MediaQuery.of(context).size.width,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildLabel('Title'),
                TextFormField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    hintText: 'Enter meeting title',
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: focusedBorder,
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                _buildLabel('Meeting Type'),
                DropdownButtonFormField<String>(
                  initialValue: _meetingType,
                  decoration: InputDecoration(
                    hintText: 'Select meeting type',
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: focusedBorder,
                  ),
                  items: _meetingTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _meetingType = val);
                  },
                ),
                const SizedBox(height: 16),
                _buildLabel('Description (Optional)'),
                TextFormField(
                  controller: _descriptionController,
                  decoration: InputDecoration(
                    hintText: 'Add some details about the meeting...',
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: focusedBorder,
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                _buildDateTimePicker('Start Time', _startAt, true),
                const SizedBox(height: 16),
                _buildDateTimePicker('End Time (Optional)', _endAt, false),
                const SizedBox(height: 16),
                _buildLabel('Mark late after (minutes)'),
                TextFormField(
                  controller: _lateAfterController,
                  decoration: InputDecoration(
                    hintText: '15',
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: focusedBorder,
                  ),
                  keyboardType: TextInputType.number,
                  validator: (val) => val == null || int.tryParse(val) == null ? 'Must be a valid number' : null,
                ),
              ],
            ),
          ),
        ),
      ),
      actionsPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(
            foregroundColor: Colors.grey.shade700,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
          child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
          child: _isSubmitting 
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
              : const Text('Save', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ],
    );
  }
}
