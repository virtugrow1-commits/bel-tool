import {it,expect} from 'vitest';
import {summarizeResults} from '@/lib/result-summary';
it('counts saved call outcomes and does not count public bookings as calls',()=>{
 expect(summarizeResults([{result:'bereikt'},{result:'geenGehoor'},{result:'voicemail'},{result:'terugbellenGepland'},{result:'afspraak'},{result:'nietInteressant'},{result:'nietBellen'},{result:'afspraak',source:'public_booking'}])).toEqual({gebeld:7,enquetes:0,afspraken:2,verstuurd:0,afgevallen:2,geenGehoor:2,callbacks:1});
});