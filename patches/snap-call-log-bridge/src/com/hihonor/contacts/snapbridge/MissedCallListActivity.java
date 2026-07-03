package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.graphics.Typeface;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.List;

public class MissedCallListActivity extends Activity {
    private LinearLayout listContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("المكالمات الفائتة");
        title.setTextSize(20f);
        title.setTypeface(null, Typeface.BOLD);
        root.addView(title);

        TextView sub = new TextView(this);
        sub.setText("لا تُحذف إلا بعد اختيارك: معاودة / واتساب / حذف");
        sub.setPadding(0, pad / 2, 0, pad);
        root.addView(sub);

        ScrollView scroll = new ScrollView(this);
        listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(listContainer);
        root.addView(scroll, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        Button close = new Button(this);
        close.setText("إغلاق");
        close.setOnClickListener(v -> finish());
        root.addView(close);

        setContentView(root);
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        render();
    }

    private void render() {
        listContainer.removeAllViews();
        List<MissedCallQueueStore.Item> items = MissedCallQueueStore.all(this);
        if (items.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("لا توجد مكالمات فائتة في القائمة.");
            listContainer.addView(empty);
            MissedCallOverlayController.refresh(this);
            return;
        }
        int gap = (int) (10 * getResources().getDisplayMetrics().density);
        for (MissedCallQueueStore.Item item : items) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(0, gap, 0, gap);

            TextView name = new TextView(this);
            name.setText(item.displayName);
            name.setTextSize(18f);
            name.setTypeface(null, Typeface.BOLD);
            card.addView(name);

            TextView num = new TextView(this);
            num.setText(item.number + (item.isSnap ? "  • Snapchat" : ""));
            card.addView(num);

            LinearLayout actions = new LinearLayout(this);
            actions.setOrientation(LinearLayout.HORIZONTAL);

            Button call = new Button(this);
            call.setText("معاودة");
            call.setOnClickListener(v -> {
                if (MissedCallActionHandler.callback(this, item)) {
                    MissedCallQueueStore.remove(this, item.id);
                    MissedCallOverlayController.refresh(this);
                    render();
                }
            });
            actions.addView(call);

            Button wa = new Button(this);
            wa.setText("واتساب");
            wa.setOnClickListener(v -> {
                if (MissedCallActionHandler.openWhatsApp(this, item)) {
                    MissedCallQueueStore.remove(this, item.id);
                    MissedCallOverlayController.refresh(this);
                    render();
                }
            });
            actions.addView(wa);

            Button del = new Button(this);
            del.setText("حذف");
            del.setOnClickListener(v -> {
                MissedCallQueueStore.remove(this, item.id);
                MissedCallOverlayController.refresh(this);
                render();
            });
            actions.addView(del);

            card.addView(actions);
            listContainer.addView(card);
        }
    }
}

