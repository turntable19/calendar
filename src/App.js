import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import './service/firebase';
import db from "./service/firebase";
import { collection, addDoc, onSnapshot, doc, deleteDoc, Timestamp, setDoc } from "firebase/firestore";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import jaLocale from '@fullcalendar/core/locales/ja';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useBooks } from './hooks/useBooks';

function App() {
  const { title, setTitle, price, setPrice, volume, setVolume } = useBooks();
  const calendarRef = useRef(null);
  const [eventsList, setEventsList] = useState([]);
  const [viewType, setViewType] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [selectedEvent, setSelectedEvent] = useState(null); 

   // 全てのイベントの価格を合計して表示
    const calculateTotalPrice = () => {
    return eventsList.reduce((total, event) => total + Number(event.price), 0);
  };

 // 一つでも入力されていないフィールドがあれば、関数の実行を停止
  const addOrUpdateEvent = async () => {
    if (title === "" || price === "" || volume === "") {
      alert("全て入力してください");
      return;
    }

    //新しいイベントの作成
    const newEvent = {
      title: title,
      start: Timestamp.fromDate(selectedDate),
      price: price,
      volume: volume,
    };
    
    //'manga'コレクションへの参照を取得
    const eventsRef = collection(db, 'manga');

    if (selectedEvent) {  // 変更のイベント
      await setDoc(doc(db, 'manga', selectedEvent.id), newEvent);
    } else { // 新規のイベント
      await addDoc(eventsRef, newEvent);
      // await addDoc(eventsRef, newEventPlusThreeMonths);
    }
    
    //初期値に戻す
    setTitle('');
    setPrice('');
    setVolume('');
    setSelectedDate(new Date());
    setSelectedEvent(null);
  };

    const deleteEvent = async (clickInfo) => {
      if (window.confirm("削除しますか?")) {
        const eventsRef = doc(db, 'manga', clickInfo.event.id);//Firebaseコレクションへの参照を取得
        await deleteDoc(eventsRef);
      }
  };
  
  const selectEvent = (clickInfo) => {
    setTitle(clickInfo.event.title);
    setPrice(clickInfo.event.extendedProps.price);
    setVolume(clickInfo.event.extendedProps.volume);
    setSelectedDate(clickInfo.event.start);
    setSelectedEvent(clickInfo.event);
  };

  //カレンダーの表示を変更
  const handleViewChange = (view) => {
    setViewType(view.view.type);
  };

  useEffect(() => {
    const eventsRef = collection(db, 'manga');//Firebaseコレクションへの参照を取得

    // onSnapshotでイベントリストをリアルタイムで取得
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      setEventsList(snapshot.docs.map((doc) => {
        const data = doc.data();
        // FirestoreのTimestamp型をJavaScriptのDate型に変換
        return { ...data, id: doc.id, start: data.start.toDate() };
      }));
    });

    // カレンダーの表示を更新
    return () => unsubscribe();
  }, []);

  //まいつきの合計金額を計算
  const groupByMonth = (events) => {
    return events.reduce((groups, event) => {
      const month = event.start.toISOString().slice(0, 7); // 'YYYY-MM'
      //データが存在しなければ、新しい配列を作成
      if (!groups[month]) {
        groups[month] = [];
      }
      //その月の配列にイベントを追加
      groups[month].push(event);
      return groups;
    }, {});
  };
  
  const calculateMonthlyTotal = (eventsByMonth) => {
    const totals = {};
    // 月ごとのイベントリストをループ処理
    for (const month in eventsByMonth) {
      // その月のイベントの価格を合計
      totals[month] = eventsByMonth[month].reduce((total, event) => total + Number(event.price), 0);
    }
    return totals;
  };
  
  const eventsByMonth = groupByMonth(eventsList);
  const monthlyTotal = calculateMonthlyTotal(eventsByMonth);

  return (
    <div>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locales={[jaLocale]}
        locale='ja'
        headerToolbar={{
          center: 'title',
          left: 'prev,next',
          right: 'listWeek,dayGridMonth', 
        }}
        events={eventsList}
        eventClick={viewType === 'listWeek' ? selectEvent : deleteEvent}
        dateClick={(info) => setSelectedDate(info.date)}
        viewDidMount={handleViewChange}
        datesSet={handleViewChange}
        displayEventTime={false}
        eventContent={(args) => {
          const { event } = args;
          // イベントの表示内容を指定
          return `${event.title} - ${event.extendedProps.price}円 `;
        }}
      />
      {viewType === 'listWeek' && (
        <div>
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="タイトル"
          />
          <input 
            type="number"
            value={price} 
            onChange={(e) => setPrice(e.target.value)} 
            placeholder="値段"
          />
          <input 
            type="number"
            value={volume} 
            onChange={(e) => setVolume(e.target.value)} 
            placeholder="巻数"
          />
          <input 
            type="date"
            value={selectedDate.toISOString().substring(0, 10)}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              if (isNaN(newDate)) {
                alert("日付を正しく入力してください");
              } else {
                setSelectedDate(newDate);
              }
            }}
            //カレンダーを開いたときに、選択されている日付を表示
            placeholder="Select Date"
          />
          <button onClick={addOrUpdateEvent}>{selectedEvent ? "更新" : "イベント追加"}</button>
        </div>
      )}
      <div>
        <h2>合計金額: {calculateTotalPrice()} 円</h2>
        <h3>月毎の合計:</h3>
        {Object.entries(calculateMonthlyTotal(groupByMonth(eventsList)))
        .sort((a, b) => a[0].localeCompare(b[0]))  
        .map(([month, total]) => (
          <p key={month}>{month}: {total}円</p>
      ))}
      </div>
    </div>
  );
}

export default App;

