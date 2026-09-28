import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class MeetingQrDisplayDialog extends StatelessWidget {
  final String qrToken;
  final String meetingTitle;

  const MeetingQrDisplayDialog({
    super.key,
    required this.qrToken,
    required this.meetingTitle,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(meetingTitle, textAlign: TextAlign.center),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Scan this code to check in:', textAlign: TextAlign.center),
          const SizedBox(height: 24),
          SizedBox(
            width: 250,
            height: 250,
            child: QrImageView(
              data: qrToken,
              version: QrVersions.auto,
              size: 250.0,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Members can scan this from their app, or scan with a standard camera to open the web check-in.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey),
          )
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }
}
