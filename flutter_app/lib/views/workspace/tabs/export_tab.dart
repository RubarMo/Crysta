import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../models.dart';
import 'step_editor_tab.dart';

class ExportTab extends StatelessWidget {
  final Novel activeNovel;
  final List<Character> characters;
  final List<Scene> scenes;
  final List<Chapter> chapters;
  final List<StepProgress> allStepsProgress;
  final String Function(int) getStepContentText;
  final String Function(String) cleanText;
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final String Function(String) t;
  final bool isMobile;

  const ExportTab({
    super.key,
    required this.activeNovel,
    required this.characters,
    required this.scenes,
    required this.chapters,
    required this.allStepsProgress,
    required this.getStepContentText,
    required this.cleanText,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    required this.t,
    required this.isMobile,
  });

  @override
  Widget build(BuildContext context) {
    final StringBuffer sb = StringBuffer();
    sb.writeln('# ${activeNovel.title}\n');
    sb.writeln('**${t('novelGenreLabel')}**: ${activeNovel.genre}');
    sb.writeln('**${t('novelAudienceLabel')}**: ${activeNovel.targetAudience}');
    sb.writeln('**${t('novelTargetWordsLabel')}**: ${activeNovel.targetWordCount}');
    sb.writeln('\n---\n');

    sb.writeln('## Step 1: ${t('step1Title')}');
    sb.writeln('${getStepContentText(1)}\n');

    sb.writeln('## Step 2: ${t('step2Title')}');
    sb.writeln('${getStepContentText(2)}\n');

    sb.writeln('## Step 3: ${t('step3Title')}');
    for (var c in characters) {
      sb.writeln('### ${c.name}');
      sb.writeln('- **Motivation**: ${c.motivation}');
      sb.writeln('- **Goal**: ${c.goal}');
      sb.writeln('- **Conflict**: ${c.conflict}');
      sb.writeln('- **Epiphany**: ${c.epiphany}');
      sb.writeln('- **Summary**: ${cleanText(c.oneParagraphSummary)}\n');
    }

    sb.writeln('## Step 4: ${t('step4Title')}');
    sb.writeln('${getStepContentText(4)}\n');

    sb.writeln('## Step 5: ${t('step5Title')}');
    for (var c in characters) {
      sb.writeln('### ${c.name} POV Synopsis');
      sb.writeln('${cleanText(c.fullSynopsis)}\n');
    }

    sb.writeln('## Step 6: ${t('step6Title')}');
    sb.writeln('${getStepContentText(6)}\n');

    sb.writeln('## Step 7: ${t('step7Title')}');
    for (var c in characters) {
      final chart = allStepsProgress.firstWhere(
        (s) => s.stepNumber == (7000 + c.id!),
        orElse: () => StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
      );
      sb.writeln('### ${c.name} Detailed Chart');
      sb.writeln('${cleanText(chart.contentText)}\n');
    }

    sb.writeln('## Step 8 & 9: Scenes Narrative');
    for (int i = 0; i < scenes.length; i++) {
      final scn = scenes[i];
      final step9Prog = allStepsProgress.firstWhere(
        (s) => s.stepNumber == (9000 + scn.id!),
        orElse: () => StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
      );
      sb.writeln('### Scene #${i + 1}: ${scn.setting}');
      sb.writeln('- **Plot Thread**: ${scn.plotThread}');
      sb.writeln('- **Summary**: ${cleanText(scn.whatHappens)}');
      sb.writeln('- **Detailed Outline**:\n${cleanText(step9Prog.contentText)}\n');
    }

    if (chapters.isNotEmpty) {
      sb.writeln('## Novel Chapters');
      for (var chap in chapters) {
        sb.writeln('### ${chap.title}');
        sb.writeln('${cleanText(chap.content)}\n');
      }
    }

    final mdContent = sb.toString();

    return Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          isMobile
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t('step10Title'),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: mdContent));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
                            );
                          },
                          icon: const Icon(Icons.copy, size: 16),
                          label: Text(t('exportCopyBtn')),
                        ),
                        StepHeaderActions(
                          isDone: isDone,
                          onToggleDone: onToggleDone,
                          onSave: onSave,
                          t: t,
                          isMobile: true,
                        ),
                      ],
                    ),
                  ],
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        t('step10Title'),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: mdContent));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
                            );
                          },
                          icon: const Icon(Icons.copy),
                          label: Text(t('exportCopyBtn')),
                        ),
                        const SizedBox(width: 8),
                        StepHeaderActions(
                          isDone: isDone,
                          onToggleDone: onToggleDone,
                          onSave: onSave,
                          t: t,
                          isMobile: false,
                        ),
                      ],
                    ),
                  ],
                ),
          const SizedBox(height: 12),
          Expanded(
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SingleChildScrollView(
                  child: SelectableText(mdContent, style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.5)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
