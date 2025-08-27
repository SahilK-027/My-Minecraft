import EventEmitter from '../Utils/EventEmitter.class';

export default class Mouse extends EventEmitter {
  constructor() {
    super();

    document.addEventListener('mousedown', (event) => {
      this.trigger('mousedown', event);
    });
  }
}
